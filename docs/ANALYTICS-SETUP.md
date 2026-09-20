# Analytics with GoatCounter (free, no cookies, no consent banner)

GoatCounter counts visits without cookies or personal data, so the site needs no
consent bar under GDPR. It is free for personal, non-commercial sites. Two pieces:

- a **site code** — the public site loads GoatCounter's counter script for it
- an **API token** — the admin dashboard reads the statistics (visitors, per-day
  chart, world map by country, top pages, sources, browsers, systems)

Prerequisite for any visits to be counted: the site must be reachable. Until the
domain is moved (see [DOMAIN-SETUP.md](DOMAIN-SETUP.md)), `urbandrone.xyz` still
points at Netlify and GitHub redirects the `github.io` address to it, so the map
stays empty. The steps below can be done now anyway.

---

## Step 1 — Create the account and site code

1. Go to https://www.goatcounter.com/signup.
2. Fill in:
   - **Code**: the subdomain for your dashboard, e.g. `urbandrone`
     → your dashboard will be `https://urbandrone.goatcounter.com`
   - **Site URL**: `https://urbandrone.xyz` (informational only; it does not have to
     resolve yet)
   - e-mail and password
3. Confirm the e-mail GoatCounter sends.
4. Log in at **`https://<code>.goatcounter.com`** (not goatcounter.com — that is only the
   sign-up and documentation site). This dashboard is where visits appear.

## Step 2 — Put the code on the site

1. Local admin → **Site** (`https://localhost:3000/admin/site`) → *Analytics* →
   **GoatCounter — site code** → enter the code (only the subdomain part, e.g.
   `urbandrone`). Save.
2. Dashboard (`/admin`) → **Publish**. Once the deploy is green, every page of the
   public site loads `gc.zgo.at/count.js` pointing at `https://<code>.goatcounter.com/count`.

Nothing else is needed on the public side — no banner, no footer link.

## Step 3 — API token for the admin dashboard

1. On **your** dashboard (`https://<code>.goatcounter.com`), click your **e-mail
   address in the top-right menu** → **API**.
   Direct link: `https://<code>.goatcounter.com/user/api`
2. **Create new API token**: give it a name (e.g. `urbandrone admin`), tick
   **Read statistics**, create. Copy the token — it is shown only once.
3. In the project's `.env`, add:
   ```
   GOATCOUNTER_API_TOKEN=<the token>
   ```
4. Restart the dev server (`Ctrl-C`, then `npm run dev:https`).
5. Open `/admin`. The **Traffic · last 30 days** card now shows real numbers
   (cached 10 minutes; *refresh* on the card bypasses the cache; *open GoatCounter*
   opens the full interface).

The token stays on your machine: `.env` is gitignored and the dashboard runs locally only.

## Check it works

```sh
# the counter script is on the live site (after publish + DNS)
curl -s https://urbandrone.xyz/ | grep -o 'goatcounter.com/count'

# the API answers with your token (replace CODE and TOKEN)
curl -s -H "Authorization: Bearer TOKEN" "https://CODE.goatcounter.com/api/v0/stats/total?start=2026-09-01T00:00:00Z&end=2026-09-30T00:00:00Z"
```

A `401` means the token is wrong or missing; `403` means the token lacks *Read statistics*.

## Notes

- **Preview without an account**: in development, `https://localhost:3000/admin/?mock=1`
  shows the Traffic card with sample data.
- **Your own visits**: GoatCounter → *Settings → Sites* has an "ignore my IP" option;
  or add `#toggle-goatcounter` to any page URL once to disable counting in that browser.
- **Limits**: the free plan is for non-commercial use with a fair-use traffic cap
  (roughly 100 k pageviews/month); the API is limited to 4 requests/second — the
  dashboard makes 6 calls every 10 minutes at most.
- **Data location**: GoatCounter is hosted in the EU (Netherlands).
- **Removing it**: clear the code in *Site → Analytics* and publish; the script
  disappears from the site.
