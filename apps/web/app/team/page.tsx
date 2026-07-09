import { listMembers, canManageMembers, ROLES } from "@aioi/database";
import { Badge } from "@aioi/ui";
import { getDevMembership } from "../lib/dev-org";
import { inviteMemberAction, changeRoleAction, removeMemberAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const { organizationId, userId, role } = await getDevMembership();
  const members = await listMembers(organizationId);
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
    </main>
  );
}
