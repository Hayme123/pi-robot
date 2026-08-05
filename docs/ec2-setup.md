# Amazon EC2 setup

This deploys `pi-robot` as a Docker Compose stack on one dedicated EC2 Ubuntu instance. Nginx is the public entry point; Fastify, Pi jobs, and Angular previews stay inside Docker.

> Pi jobs share the API container. Do not run unrelated workloads or keep unrelated host credentials on this instance.

## 1. SSH into the instance

Create an Ubuntu EC2 instance, attach an Elastic IP, and allow only TCP 22, 80, and 443 in its EC2 Security Group. Restrict port 22 to your office or VPN IP where possible. Do not open port 3000 or ports 4200–4299.

From your workstation:

```bash
chmod 600 ~/Downloads/ec2-key.pem
ssh -i ~/Downloads/ec2-key.pem ubuntu@YOUR_EC2_ELASTIC_IP
```

Update the host and reconnect after the reboot:

```bash
sudo apt-get update
sudo apt-get upgrade -y
sudo reboot
```

## 2. Install Docker and Git

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
printf '%s\n' \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker "$USER"
exit
```

SSH in again, then confirm Docker works:

```bash
docker --version
docker compose version
docker run --rm hello-world
```

## 3. Clone the application

```bash
sudo mkdir -p /opt/app
sudo chown "$USER":"$USER" /opt/app
cd /opt/app
git clone https://github.com/Hayme123/pi-robot.git pi-robot
cd pi-robot
cp .env.example .env
mkdir -p projects .pi-agent
chmod 600 .env
chmod 700 projects .pi-agent
```

For a private repository, use a read-only deploy key. Never store repository credentials in `.env` or a generated project workspace.

## 4. Configure Pi

The API container mounts `./.pi-agent` at `/workspace/.pi-agent`. Put the required Pi settings, model registry, skills, and provider authentication in that directory. Keep authentication files out of Git, generated projects, and R2 archives.

```bash
find .pi-agent -maxdepth 2 -type f -print
```

## 5. Configure secrets

Edit `.env`:

```bash
nano .env
```

Set the Figma, Font Awesome, Supabase, R2, and expiration values from `.env.example`. Use container paths in Compose:

```dotenv
PUBLIC_BASE_URL=https://pi.example.com
NGINX_PORT=80
PROJECTS_ROOT=/workspace/projects
R2_SIGNED_URL_TTL_SECONDS=300
EXPIRY_CRON_SECRET=REPLACE_WITH_A_RANDOM_VALUE
```

Generate the expiration secret with:

```bash
openssl rand -hex 32
```

### Private npm registry authentication

The scaffold installs `@ntv360` packages from `npm-dev.n-compass.online` during the Docker build. `NPM_TOKEN` must be a valid credential for that registry.

The current scaffold uses npm's `_auth` setting. Supply a Base64-encoded `username:password` credential without quotes:

```dotenv
NPM_TOKEN=BASE64_ENCODED_USERNAME_COLON_PASSWORD
```

Do not use an npmjs.com token, a GitHub token, or a placeholder. The credential must be authorized to download `@ntv360/component-pantry`. The value is passed as a Docker BuildKit secret and is not retained in the built image.

## 6. Provision Supabase and R2

1. Create a private Cloudflare R2 bucket.
2. Create an R2 API credential limited to that bucket with object read/write access.
3. Add its account ID, bucket name, key ID, and secret to `.env`.
4. Create/select the Supabase project.
5. Apply [`sql-schema.md`](sql-schema.md) through the Supabase SQL editor or your migration workflow.
6. Set its URL and JWT configuration in `.env`.

R2 remains private. The application uses short-lived signed URLs for downloads.

## 7. Configure DNS and TLS

Attach an Elastic IP to the EC2 instance. Create an `A` record for the hostname used by `PUBLIC_BASE_URL`:

```text
pi.example.com.  A  YOUR_EC2_ELASTIC_IP
```

Wait for DNS before enabling HTTPS:

```bash
getent hosts pi.example.com
```

The included Nginx config listens on HTTP. Add TLS at Nginx or terminate TLS through a trusted reverse proxy/CDN before production traffic. Set `PUBLIC_BASE_URL` to the actual HTTPS URL only after HTTPS works.

## 8. Build and start

Compose reads `NPM_TOKEN` from `.env` to provide its BuildKit secret:

```bash
docker compose build --no-cache
docker compose up -d
docker compose ps
docker compose logs --tail=100 api
docker compose logs --tail=100 nginx
```

Validate Nginx and the health endpoint locally:

```bash
docker compose exec nginx nginx -t
curl -i http://127.0.0.1/health
```

If `NGINX_PORT` is not `80`, use that port in the curl command.

Nginx sends regular requests to Fastify and proxies `/previews/4200/` through `/previews/4299/` to Angular development servers inside the API container.

## 9. Verify externally

From your workstation:

```bash
curl -i https://pi.example.com/health
```

Use an authenticated API request to create or run a project. A running preview URL looks like:

```text
https://pi.example.com/previews/4200/
```

Check that the preview loads and that Angular live reload works through the public hostname.

## 10. Operations

### Deploy an update

```bash
cd /opt/app/pi-robot
git pull --ff-only
docker compose build
docker compose up -d
docker compose ps
```

### Logs and restarts

```bash
docker compose logs -f api
docker compose logs -f nginx
docker compose restart
docker compose down
```

Stopping Compose stops active previews. Project folders are local cache; completed artifacts remain in R2 and can be restored by later HTML, Angular, revision, or run requests.

### Security and maintenance

- Keep `.env` mode `600` and `.pi-agent` mode `700`.
- Back up secrets through encrypted secret management, never Git or R2 project archives.
- Rotate provider, Supabase, R2, registry, and cron credentials after exposure.
- Apply Ubuntu updates regularly and rebuild after dependency updates.
