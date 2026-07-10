---
"@aioi/database": minor
"@aioi/web": minor
---

Referral loop. Each org gets a shareable referral code (Organization.referralCode); a new org can
apply a code (referredByCode) and the referrer sees how many teams joined via their link. New
getOrCreateReferralCode / getReferralStats / applyReferralCode helpers + a /referrals page (link,
copy, stats, apply form). Full auto-capture at signup is a follow-on.
