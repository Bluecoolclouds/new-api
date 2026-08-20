package openai

import (
	"testing"

	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/dto"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
)

func TestApplyUsagePostProcessing_ClaudeCacheWriteTokensNonStandardLocation(t *testing.T) {
	// Reproduces the vveai (Claude-via-OpenAI-compatible) response shape where
	// cache creation tokens are reported as prompt_tokens_details.cache_write_tokens
	// instead of the standard cached_creation_tokens field.
	body := []byte(`{
		"usage": {
			"prompt_tokens": 35,
			"completion_tokens": 576,
			"total_tokens": 611,
			"prompt_tokens_details": {
				"cached_tokens": 36,
				"cache_write_tokens": 21013
			}
		}
	}`)

	info := &relaycommon.RelayInfo{ChannelMeta: &relaycommon.ChannelMeta{ChannelType: constant.ChannelTypeOpenAI}}
	usage := &dto.Usage{
		PromptTokens:     35,
		CompletionTokens: 576,
		TotalTokens:      611,
	}
	usage.PromptTokensDetails.CachedTokens = 36

	applyUsagePostProcessing(info, usage, body)

	if usage.PromptTokensDetails.CachedCreationTokens != 21013 {
		t.Fatalf("expected CachedCreationTokens=21013, got %d", usage.PromptTokensDetails.CachedCreationTokens)
	}
}

func TestApplyUsagePostProcessing_ClaudeCacheCreationInputTokensAltName(t *testing.T) {
	body := []byte(`{
		"usage": {
			"prompt_tokens": 10,
			"completion_tokens": 5,
			"cache_creation_input_tokens": 500
		}
	}`)

	info := &relaycommon.RelayInfo{ChannelMeta: &relaycommon.ChannelMeta{ChannelType: constant.ChannelTypeOpenAI}}
	usage := &dto.Usage{PromptTokens: 10, CompletionTokens: 5}

	applyUsagePostProcessing(info, usage, body)

	if usage.PromptTokensDetails.CachedCreationTokens != 500 {
		t.Fatalf("expected CachedCreationTokens=500, got %d", usage.PromptTokensDetails.CachedCreationTokens)
	}
}

func TestApplyUsagePostProcessing_DoesNotOverrideStandardField(t *testing.T) {
	body := []byte(`{
		"usage": {
			"prompt_tokens_details": {
				"cache_write_tokens": 999
			}
		}
	}`)

	info := &relaycommon.RelayInfo{ChannelMeta: &relaycommon.ChannelMeta{ChannelType: constant.ChannelTypeOpenAI}}
	usage := &dto.Usage{}
	usage.PromptTokensDetails.CachedCreationTokens = 42

	applyUsagePostProcessing(info, usage, body)

	if usage.PromptTokensDetails.CachedCreationTokens != 42 {
		t.Fatalf("expected existing CachedCreationTokens=42 to be preserved, got %d", usage.PromptTokensDetails.CachedCreationTokens)
	}
}

func TestApplyUsagePostProcessing_NoCacheCreationFieldsPresent(t *testing.T) {
	body := []byte(`{"usage": {"prompt_tokens": 10, "completion_tokens": 5}}`)

	info := &relaycommon.RelayInfo{ChannelMeta: &relaycommon.ChannelMeta{ChannelType: constant.ChannelTypeOpenAI}}
	usage := &dto.Usage{PromptTokens: 10, CompletionTokens: 5}

	applyUsagePostProcessing(info, usage, body)

	if usage.PromptTokensDetails.CachedCreationTokens != 0 {
		t.Fatalf("expected CachedCreationTokens=0, got %d", usage.PromptTokensDetails.CachedCreationTokens)
	}
}
