import { listMembers, getOrgIntegration, canManageMembers, ROLES } from "@aioi/database";
import { Badge } from "@aioi/ui";
import { getDevMembership } from "../lib/dev-org";
import {
  inviteMemberAction,
  changeRoleAction,
  removeMemberAction,
  saveIntegrationAction,
  disconnectIntegrationAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const { organizationId, userId, role } = await getDevMembership();
  const [members, integration] = await Promise.all([
    listMembers(organizationId),
    getOrgIntegration(organizationId),
  ]);
  const canManage = canManageMembers(role);

  return (
    <main>
      <h1 style={{ fontSize: "1.5rem", margin: "0 0 4px" }}>Team</h1>
      <p style={{ color: "var(--fg-muted)", margin: "0 0 20px" }}>
        {members.length} {members.length === 1 ? "member" : "members"} · you are{" "}
        <strong>{role}</strong>.
      </p>

      {canManage ? (
        <form action={inviteMemberAction} className="team-invite">
          <input
            name="email"
            type="email"
            required
            placeholder="teammate@company.com"
            aria-label="Invite by email"
            className="team-input"
          />
          <select name="role" defaultValue="MEMBER" aria-label="Role" className="team-select">
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button type="submit" className="watch-btn">
            Invite
          </button>
        </form>
      ) : (
        <p className="trend-meta">Only owners and admins can manage the team.</p>
      )}

      <div className="member-list">
        {members.map((m) => {
          const manageable = canManage && m.userId !== userId;
          return (
            <div key={m.userId} className="member-row">
              <div>
                <div className="member-name">
                  {m.name ?? m.email}
                  {m.userId === userId && <span className="member-you">you</span>}
                  {m.pending && <span className="member-pending">pending</span>}
                </div>
                <div className="member-email">{m.email}</div>
              </div>
              <div className="member-actions">
                {manageable ? (
                  <>
                    <form action={changeRoleAction} className="member-role-form">
                      <input type="hidden" name="userId" value={m.userId} />
                      <select name="role" defaultValue={m.role} className="team-select">
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                      <button type="submit" className="member-btn">
                        Save
                      </button>
                    </form>
                    <form action={removeMemberAction}>
                      <input type="hidden" name="userId" value={m.userId} />
                      <button type="submit" className="member-btn member-btn-danger">
                        Remove
                      </button>
                    </form>
                  </>
                ) : (
                  <Badge>{m.role}</Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {canManage && (
        <>
          <h2 style={{ fontSize: "1.25rem", margin: "36px 0 4px" }}>Digest delivery</h2>
          <p style={{ color: "var(--fg-muted)", fontSize: "0.8125rem", margin: "0 0 14px" }}>
            Post the daily brief to your team&rsquo;s Slack or Discord. Paste an{" "}
            <strong>incoming webhook</strong> URL.
          </p>

          <div className="integration-status">
            <Channel
              label="Slack"
              connected={Boolean(integration?.slackWebhookUrl)}
              channel="slack"
            />
            <Channel
              label="Discord"
              connected={Boolean(integration?.discordWebhookUrl)}
              channel="discord"
            />
          </div>

          <form action={saveIntegrationAction} className="integration-form">
            <input
              name="slack"
              type="url"
              className="team-input"
              aria-label="Slack webhook URL"
              placeholder={
                integration?.slackWebhookUrl
                  ? "Slack connected — paste a new URL to replace"
                  : "https://hooks.slack.com/services/…"
              }
            />
            <input
              name="discord"
              type="url"
              className="team-input"
              aria-label="Discord webhook URL"
              placeholder={
                integration?.discordWebhookUrl
                  ? "Discord connected — paste a new URL to replace"
                  : "https://discord.com/api/webhooks/…"
              }
            />
            <label className="integration-toggle">
              <input
                type="checkbox"
                name="digestEnabled"
                defaultChecked={integration?.digestEnabled ?? true}
              />
              Send the daily digest
            </label>
            <button type="submit" className="watch-btn">
              Save
            </button>
          </form>
        </>
      )}
    </main>
  );
}

function Channel({
  label,
  connected,
  channel,
}: {
  label: string;
  connected: boolean;
  channel: string;
}) {
  return (
    <span className="integration-channel">
      <span className={`integration-dot${connected ? " is-on" : ""}`} />
      <b>{label}</b> {connected ? "connected" : "not connected"}
      {connected && (
        <form action={disconnectIntegrationAction} style={{ display: "inline" }}>
          <input type="hidden" name="channel" value={channel} />
          <button type="submit" className="integration-disconnect">
            Disconnect
          </button>
        </form>
      )}
    </span>
  );
}
