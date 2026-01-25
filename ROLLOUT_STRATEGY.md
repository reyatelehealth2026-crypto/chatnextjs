# Inbox Next.js Rollout Strategy

This document outlines the phased approach for migrating from the PHP-based inbox to the new Next.js system.

## Phase 1: Foundation & Parallel Data (Current)
- **Goal**: Establish the Next.js infrastructure and ensure data consistency.
- **Actions**:
    - Deploy Next.js system on the same server as PHP.
    - Connect Next.js to the shared MySQL database.
    - Run `migrate-from-php.ts` to sync existing data.
    - **Status**: Ready for deployment.

## Phase 2: Alpha Testing (Internal Only)
- **Goal**: Validate core features in a production-like environment.
- **Actions**:
    - Accessible only via internal VPN or specific IP addresses.
    - Internal staff uses the new `/inbox` for daily operations.
    - Monitor `logs/err.log` for any runtime exceptions.
    - **Success Criteria**: No P0 bugs found during 3 days of active use.

## Phase 3: Beta Testing (Staged Rollout)
- **Goal**: Gradual exposure to production users.
- **Actions**:
    - **Nginx Cookie Routing**: Enable the new inbox for specific admin accounts using a cookie (`use_nextjs=true`).
    - **Feedback Loop**: Provide a "Switch to Old Version" button that sets the cookie to `false`.
    - **Monitoring**: Check `monitor-alerts.sh` results every hour.
    - **Success Criteria**: Positive feedback from beta users, performance within targets.

## Phase 4: Full Production Rollout
- **Goal**: Decommission the PHP inbox for all users.
- **Actions**:
    - Update Nginx to route all `/inbox` traffic to Next.js.
    - Remove the "Switch to Old Version" button.
    - Monitor system resources (`pm2 monit`).
    - **Success Criteria**: 100% of admin traffic handled by Next.js for 1 week without major issues.

## Phase 5: Cleanup
- **Goal**: Remove obsolete PHP code.
- **Actions**:
    - Archive old PHP inbox files.
    - Finalize database schema (remove any PHP-only columns if no longer needed).

---

## Rollback Plan

### Immediate Rollback (Critical Issues)
If the system becomes unavailable or data corruption is detected:
1.  **Revert Nginx**: Replace the Nginx config with the backup (where `/inbox` points to PHP).
    ```bash
    sudo cp /etc/nginx/sites-available/default.backup /etc/nginx/sites-enabled/default
    sudo systemctl reload nginx
    ```
2.  **Notify Team**: Inform the development team and stakeholders.
3.  **Analyze**: Use PM2 logs and database snapshots to identify the root cause.

### Gradual Rollback (Performance/UX Issues)
If users report significant UX regressions:
1.  **Feature Flag**: Set the `use_nextjs` cookie to `false` for affected users.
2.  **Fix & Verify**: Address issues in a staging environment before re-enabling for beta users.

## Monitoring & Observability
- **Application Health**: `/api/health`
- **Error Tracking**: PM2 `err.log` + `monitor-alerts.sh`
- **Performance**: Browser dev tools (Lighthouse) + `e2e/perf.spec.ts`
- **Database**: Prisma Studio (`npm run db:studio`)
