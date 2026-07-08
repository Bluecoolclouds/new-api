package model

const (
        PaymentMethodFreeKassa = "freekassa"
        PaymentMethodHeleket   = "heleket"
        PaymentMethodPally     = "pally"

        PaymentMethodPlategal     = "plategal"
        PaymentMethodPlategalSBP  = "plategal_sbp"
        PaymentMethodPlategalCard = "plategal_card"
        PaymentMethodPlategalIntl = "plategal_intl"

        PaymentProviderFreeKassa = "freekassa"
        PaymentProviderHeleket   = "heleket"
        PaymentProviderPally     = "pally"
        PaymentProviderPlategal  = "plategal"
)

func RewardReferralChain(userId int, quota int) {
        if quota <= 0 {
                return
        }
        user, err := GetUserById(userId, false)
        if err != nil || user == nil || user.InviterId == 0 {
                return
        }
        inviter, err := GetUserById(user.InviterId, false)
        if err != nil || inviter == nil {
                return
        }
        _ = IncreaseUserQuota(user.InviterId, quota/10, true)
}

func RechargeHeleket(tradeNo string, callerIp string) error {
        return completePendingTopUp(tradeNo, PaymentProviderHeleket, callerIp, "Heleket")
}

func RechargePally(tradeNo string, callerIp string) error {
        return completePendingTopUp(tradeNo, PaymentProviderPally, callerIp, "Pally")
}

func RechargePlategal(tradeNo string, callerIp string) error {
        return completePendingTopUp(tradeNo, PaymentProviderPlategal, callerIp, "Plategal")
}

func completePendingTopUp(tradeNo string, provider string, callerIp string, providerName string) error {
        topUp := GetTopUpByTradeNo(tradeNo)
        if topUp == nil {
                return nil
        }
        if topUp.Status != "pending" {
                return nil
        }
        if err := UpdatePendingTopUpStatus(tradeNo, provider, "success"); err != nil {
                return err
        }
        if err := IncreaseUserQuota(topUp.UserId, int(topUp.Amount), true); err != nil {
                return err
        }
        RecordTopupLog(topUp.UserId, providerName+"充值成功", callerIp, topUp.PaymentMethod, provider)
        return nil
}
