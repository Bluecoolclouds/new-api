package together

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/relay/channel"
	taskcommon "github.com/QuantumNous/new-api/relay/channel/task/taskcommon"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/service"
	"github.com/gin-gonic/gin"
	"github.com/pkg/errors"
)

const defaultSeedanceSeconds = 5
const defaultSeedanceResolution = "720p"

var _ channel.TaskAdaptor = (*TaskAdaptor)(nil)
var _ channel.OpenAIVideoConverter = (*TaskAdaptor)(nil)

// requestPayload matches Together's video create body.
type requestPayload struct {
	Model          string                 `json:"model"`
	Prompt         string                 `json:"prompt"`
	Resolution     string                 `json:"resolution,omitempty"`
	Ratio          string                 `json:"ratio,omitempty"`
	Seconds        string                 `json:"seconds,omitempty"`
	Fps            int                    `json:"fps,omitempty"`
	Steps          int                    `json:"steps,omitempty"`
	Seed           int                    `json:"seed,omitempty"`
	GuidanceScale  int                    `json:"guidance_scale,omitempty"`
	OutputFormat   string                 `json:"output_format,omitempty"`
	OutputQuality  int                    `json:"output_quality,omitempty"`
	NegativePrompt string                 `json:"negative_prompt,omitempty"`
	GenerateAudio  *bool                  `json:"generate_audio,omitempty"`
	Media          map[string]any         `json:"media,omitempty"`
	Metadata       map[string]interface{} `json:"-"`
}

type responsePayload struct {
	ID          string `json:"id"`
	Object      string `json:"object"`
	Model       string `json:"model"`
	Status      string `json:"status"`
	CreatedAt   int64  `json:"created_at"`
	CompletedAt int64  `json:"completed_at,omitempty"`
	Size        string `json:"size"`
	Seconds     string `json:"seconds"`
	Outputs     struct {
		Cost     float64 `json:"cost"`
		VideoURL string  `json:"video_url"`
	} `json:"outputs"`
	Error *struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

type taskResultPayload struct {
	State   string `json:"state"`
	Status  string `json:"status"`
	ID      string `json:"id"`
	Error   *struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	} `json:"error,omitempty"`
	Outputs *struct {
		Cost     float64 `json:"cost"`
		VideoURL string  `json:"video_url"`
	} `json:"outputs,omitempty"`
}

type TaskAdaptor struct {
	taskcommon.BaseBilling
	ChannelType int
	apiKey      string
	baseURL     string
}

func (a *TaskAdaptor) ConvertToOpenAIVideo(originTask *model.Task) ([]byte, error) {
	if originTask == nil {
		return nil, fmt.Errorf("task is nil")
	}
	openAIVideo := originTask.ToOpenAIVideo()
	return common.Marshal(openAIVideo)
}

func (a *TaskAdaptor) Init(info *relaycommon.RelayInfo) {
	a.ChannelType = info.ChannelType
	a.baseURL = info.ChannelBaseUrl
	a.apiKey = info.ApiKey
}

func (a *TaskAdaptor) ValidateRequestAndSetAction(c *gin.Context, info *relaycommon.RelayInfo) (taskErr *dto.TaskError) {
	return relaycommon.ValidateBasicTaskRequest(c, info, constant.TaskActionTextGenerate)
}

func (a *TaskAdaptor) BuildRequestURL(info *relaycommon.RelayInfo) (string, error) {
	return fmt.Sprintf("%s/v2/videos", a.baseURL), nil
}

func (a *TaskAdaptor) BuildRequestHeader(c *gin.Context, req *http.Request, info *relaycommon.RelayInfo) error {
	req.Header.Set("Authorization", "Bearer "+a.apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	return nil
}

func (a *TaskAdaptor) EstimateBilling(c *gin.Context, info *relaycommon.RelayInfo) map[string]float64 {
	req, err := relaycommon.GetTaskRequest(c)
	if err != nil {
		return nil
	}
	seconds := req.Duration
	if seconds <= 0 {
		if s, err := strconv.Atoi(strings.TrimSpace(req.Seconds)); err == nil {
			seconds = s
		}
	}
	if seconds <= 0 {
		seconds = defaultSeedanceSeconds
	}
	resolution := strings.TrimSpace(req.Size)
	if resolution == "" {
		resolution = defaultSeedanceResolution
	}
	return map[string]float64{
		"seconds":    float64(seconds),
		"resolution": seedanceResolutionRatio(resolution),
	}
}

func isWanModel(modelName string) bool {
	m := strings.ToLower(modelName)
	return strings.HasPrefix(m, "wan") || strings.Contains(m, "wan2")
}

func seedanceNormalizeResolution(size string, isWan bool) string {
	size = strings.ToLower(strings.TrimSpace(size))
	if size == "1920x1080" || size == "1080x1920" || size == "1080p" {
		if isWan {
			return "1080P"
		}
		return "1080p"
	}
	if size == "1280x720" || size == "720x1280" || size == "720p" {
		if isWan {
			return "720P"
		}
		return "720p"
	}
	if size == "640x480" || size == "854x480" || size == "480p" {
		if isWan {
			return "720P"
		}
		return "480p"
	}
	if isWan {
		return "720P"
	}
	return defaultSeedanceResolution
}

func (a *TaskAdaptor) BuildRequestBody(c *gin.Context, info *relaycommon.RelayInfo) (io.Reader, error) {
	req, err := relaycommon.GetTaskRequest(c)
	if err != nil {
		return nil, errors.Wrap(err, "get_task_request_failed")
	}

	wan := isWanModel(info.UpstreamModelName)

	body := requestPayload{
		Model:         info.UpstreamModelName,
		Prompt:        req.Prompt,
		Resolution:    seedanceNormalizeResolution(req.Size, wan),
		Seconds:       seedanceNormalizeSeconds(req),
		OutputFormat:  "MP4",
		OutputQuality: 20,
		GenerateAudio: nil,
	}

	if wan {
		if req.Metadata != nil {
			if r, ok := req.Metadata["ratio"].(string); ok && r != "" {
				body.Ratio = r
			} else if r, ok := req.Metadata["aspect_ratio"].(string); ok && r != "" {
				body.Ratio = r
			}
		}
		if body.Ratio == "" && strings.Contains(req.Size, ":") {
			body.Ratio = req.Size
		}
		if body.Ratio == "" {
			body.Ratio = "16:9"
		}
	}

	if media := seedanceBuildMedia(req); len(media) > 0 {
		body.Media = media
	}
	if err := taskcommon.UnmarshalMetadata(req.Metadata, &body); err != nil {
		return nil, errors.Wrap(err, "unmarshal_metadata_failed")
	}
	if body.Model == "" {
		body.Model = "ByteDance/Seedance-2.5"
	}
	if body.Resolution == "" {
		body.Resolution = seedanceNormalizeResolution("", wan)
	}
	if body.Seconds == "" {
		body.Seconds = strconv.Itoa(defaultSeedanceSeconds)
	}
	data, err := common.Marshal(body)
	if err != nil {
		return nil, err
	}
	return bytes.NewReader(data), nil
}

func seedanceNormalizeSeconds(req relaycommon.TaskSubmitReq) string {
	seconds := req.Duration
	if seconds <= 0 {
		if s, err := strconv.Atoi(strings.TrimSpace(req.Seconds)); err == nil {
			seconds = s
		}
	}
	if seconds <= 0 {
		seconds = defaultSeedanceSeconds
	}
	if seconds < 4 {
		seconds = 4
	}
	if seconds > 30 {
		seconds = 30
	}
	return strconv.Itoa(seconds)
}

func seedanceResolutionRatio(resolution string) float64 {
	switch strings.ToLower(strings.TrimSpace(resolution)) {
	case "480p":
		return 1
	case "720p":
		return 2.1652173913
	case "1080p":
		return 3.5
	default:
		return 2.1652173913
	}
}

func seedanceBuildMedia(req relaycommon.TaskSubmitReq) map[string]any {
	media := map[string]any{}

	images := req.Images
	if len(images) == 0 && req.Image != "" {
		images = []string{req.Image}
	}
	if len(images) > 0 {
		media["frame_images"] = seedanceFrameImages(images)
	}

	if req.Metadata != nil {
		if nested, ok := req.Metadata["media"].(map[string]any); ok {
			for k, v := range nested {
				media[k] = v
			}
		}
		if v, ok := req.Metadata["frame_images"]; ok {
			media["frame_images"] = v
		}
		if v, ok := req.Metadata["reference_images"]; ok {
			media["reference_images"] = v
		}
		if v, ok := req.Metadata["reference_videos"]; ok {
			media["reference_videos"] = v
		}
		if v, ok := req.Metadata["reference_audios"]; ok {
			media["reference_audios"] = v
		}
	}

	if len(media) == 0 {
		return nil
	}
	return media
}

func seedanceFrameImages(images []string) []map[string]any {
	if len(images) == 0 {
		return nil
	}
	if len(images) == 1 {
		return []map[string]any{{"input_image": images[0], "frame": "first"}}
	}
	return []map[string]any{
		{"input_image": images[0], "frame": "first"},
		{"input_image": images[1], "frame": "last"},
	}
}

func (a *TaskAdaptor) DoRequest(c *gin.Context, info *relaycommon.RelayInfo, requestBody io.Reader) (*http.Response, error) {
	return channel.DoTaskApiRequest(a, c, info, requestBody)
}

func (a *TaskAdaptor) DoResponse(c *gin.Context, resp *http.Response, info *relaycommon.RelayInfo) (taskID string, taskData []byte, taskErr *dto.TaskError) {
	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", nil, service.TaskErrorWrapper(err, "read_response_body_failed", http.StatusInternalServerError)
	}
	_ = resp.Body.Close()

	var r responsePayload
	if err := common.Unmarshal(responseBody, &r); err != nil {
		return "", nil, service.TaskErrorWrapper(errors.Wrap(err, string(responseBody)), "unmarshal_response_failed", http.StatusInternalServerError)
	}
	if r.Error != nil {
		return "", nil, service.TaskErrorWrapperLocal(fmt.Errorf("%s", r.Error.Message), r.Error.Code, http.StatusBadRequest)
	}
	if strings.TrimSpace(r.ID) == "" {
		return "", nil, service.TaskErrorWrapperLocal(fmt.Errorf("missing video job id"), "invalid_response", http.StatusInternalServerError)
	}

	ov := dto.NewOpenAIVideo()
	ov.ID = info.PublicTaskID
	ov.TaskID = info.PublicTaskID
	ov.CreatedAt = time.Now().Unix()
	ov.Model = info.OriginModelName
	ov.Seconds = r.Seconds
	ov.Size = r.Size
	ov.Status = "in_progress"
	c.JSON(http.StatusOK, ov)
	return r.ID, responseBody, nil
}

func (a *TaskAdaptor) FetchTask(baseUrl, key string, body map[string]any, proxy string) (*http.Response, error) {
	taskID, ok := body["task_id"].(string)
	if !ok {
		return nil, fmt.Errorf("invalid task_id")
	}
	url := fmt.Sprintf("%s/v2/videos/%s", baseUrl, taskID)
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+key)
	req.Header.Set("Accept", "application/json")
	client, err := service.GetHttpClientWithProxy(proxy)
	if err != nil {
		return nil, fmt.Errorf("new proxy http client failed: %w", err)
	}
	return client.Do(req)
}

func (a *TaskAdaptor) ParseTaskResult(respBody []byte) (*relaycommon.TaskInfo, error) {
	var r taskResultPayload
	if err := common.Unmarshal(respBody, &r); err != nil {
		return nil, err
	}
	ti := &relaycommon.TaskInfo{Code: 0}
	rawStatus := r.Status
	if rawStatus == "" {
		rawStatus = r.State
	}
	switch strings.ToLower(strings.TrimSpace(rawStatus)) {
	case "queued", "pending":
		ti.Status = model.TaskStatusQueued
	case "processing", "in_progress":
		ti.Status = model.TaskStatusInProgress
	case "completed", "success":
		ti.Status = model.TaskStatusSuccess
		if r.Outputs != nil {
			ti.Url = r.Outputs.VideoURL
			ti.RemoteUrl = r.Outputs.VideoURL
		}
	case "failed", "cancelled":
		ti.Status = model.TaskStatusFailure
		if r.Error != nil && r.Error.Message != "" {
			ti.Reason = r.Error.Message
		} else {
			ti.Reason = "task failed"
		}
	default:
		ti.Status = model.TaskStatusInProgress
	}
	return ti, nil
}

func (a *TaskAdaptor) GetModelList() []string { return ModelList }
func (a *TaskAdaptor) GetChannelName() string { return ChannelName }
