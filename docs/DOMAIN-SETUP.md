# Pointing urbandrone.xyz at GitHub Pages (leaving Netlify)

Goal: `https://urbandrone.xyz` served directly by GitHub Pages, DNS hosted at
OVH (the registrar), Netlify no longer involved.

```
Before                                  After
──────                                  ─────
Registrar:  OVH                         Registrar:  OVH
DNS:        Netlify (nsone.net)         DNS:        OVH
Hosting:    Netlify                     Hosting:    GitHub Pages
```

State of the Netlify zone on 2026-09-20 (nothing else to migrate — no MX, no TXT):

| Record | Value |
|---|---|
| `@` A | 63.176.8.218, 35.157.26.135 (Netlify) |
| `@` AAAA | 2a05:d014:58f:6200::258, ::259 (Netlify) |
| `www` | → Netlify |

Already done on the GitHub side:

- Repo: https://github.com/urbandronedesign/urbandrone-Lab
- Pages source: GitHub Actions (`.github/workflows/deploy.yml`)
- Custom domain set to `urbandrone.xyz` (Settings → Pages)
- `public/CNAME` contains `urbandrone.xyz`

---

## Step 1 — Switch nameservers to OVH

1. Sign in to https://www.ovh.com/manager/ → **Web Cloud** → **Domain names** → `urbandrone.xyz`.
2. Open the **DNS servers** tab.
3. Click **Modify DNS servers** → choose **Use OVH DNS servers** (the default set,
   e.g. `dns13.ovh.net` / `ns13.ovh.net` — the exact numbers vary).
4. Confirm. OVH shows the change as pending; it can take up to 24 h to propagate, usually 1–2 h.

> From this moment the Netlify site is no longer reachable on the domain.

Check propagation (PowerShell or Git Bash):

```sh
nslookup -type=NS urbandrone.xyz
# expect:  urbandrone.xyz  nameserver = dnsXX.ovh.net / nsXX.ovh.net
```

## Step 2 — Create the records in the OVH zone

Same domain → **DNS zone** tab. If OVH says the zone is not managed here yet, wait
for Step 1 to finish.

1. Delete every existing `A`, `AAAA` and `CNAME` record for the root (empty
   sub-domain) and for `www`. Leave `NS` and `SOA` alone.
2. **Add an entry** → type **A**, four times, sub-domain left empty:

   | Sub-domain | Target |
   |---|---|
   | *(empty)* | `185.199.108.153` |
   | *(empty)* | `185.199.109.153` |
   | *(empty)* | `185.199.110.153` |
   | *(empty)* | `185.199.111.153` |

3. Optional but recommended, IPv6 — type **AAAA**, sub-domain empty:

   | Sub-domain | Target |
   |---|---|
   | *(empty)* | `2606:50c0:8000::153` |
   | *(empty)* | `2606:50c0:8001::153` |
   | *(empty)* | `2606:50c0:8002::153` |
   | *(empty)* | `2606:50c0:8003::153` |

4. **Add an entry** → type **CNAME**:

   | Sub-domain | Target |
   |---|---|
   | `www` | `urbandronedesign.github.io.` (note the trailing dot) |

5. Save. OVH applies zone changes within a few minutes (TTL default 3600 s).

GitHub's current IPs are listed at
https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site
— check there if this document is old.

Verify:

```sh
nslookup -type=A urbandrone.xyz
# expect the four 185.199.x.153 addresses
nslookup www.urbandrone.xyz
# expect: canonical name = urbandronedesign.github.io
```

## Step 3 — Let GitHub verify and issue the certificate

1. GitHub → repo → **Settings → Pages**. Under *Custom domain* the status turns
   from "DNS check in progress" to a green tick once the records above resolve.
2. GitHub then requests a Let's Encrypt certificate automatically (a few minutes,
   occasionally up to an hour). While it is pending the **Enforce HTTPS** box is greyed out.
3. Tick **Enforce HTTPS** as soon as it becomes available.

Or from the terminal with the GitHub CLI:

```sh
gh api repos/urbandronedesign/urbandrone-Lab/pages --jq '{cname, https_enforced, protected_domain_state}'
# once the cert exists:
gh api -X PUT repos/urbandronedesign/urbandrone-Lab/pages -F https_enforced=true
```

Final check:

```sh
curl -sI https://urbandrone.xyz/ | head -3          # HTTP/2 200, server: GitHub.com
curl -sI http://urbandrone.xyz/  | head -3          # 301 → https://
curl -sI https://www.urbandrone.xyz/ | head -3      # 301 → https://urbandrone.xyz/
```

## Step 4 — Clean up Netlify (optional)

Netlify → the old site → **Domain management** → remove `urbandrone.xyz`, then
delete the site if you no longer need it. Netlify DNS for the domain can be
deleted too (Netlify → **Domains**); it is inert once the nameservers point to OVH.

---

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Page loads but has no CSS/JS at `urbandronedesign.github.io/urbandrone-Lab/` | Expected. The build targets the root of the custom domain; use `urbandrone.xyz`. |
| GitHub says "Domain's DNS record could not be retrieved" | Nameserver or A records not propagated yet. Re-check with `nslookup`; wait. |
| "Domain is already taken" in Pages settings | Another GitHub repo/account already claims `urbandrone.xyz`. Remove it there first. |
| Certificate stuck pending > 1 h | Remove the custom domain in Settings → Pages, save, re-add it. Also make sure there is no `CAA` record blocking Let's Encrypt (`nslookup -type=CAA urbandrone.xyz` should return nothing). |
| Old Netlify page still shows | Local DNS cache. `ipconfig /flushdns` on Windows, or test from a phone on mobile data. |

## Rollback

Point the nameservers back to `dns1.p02.nsone.net` … `dns4.p02.nsone.net` in
OVH (Step 1 in reverse). The Netlify zone still exists until you delete it in Step 4.
