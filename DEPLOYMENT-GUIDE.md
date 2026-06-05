# Ziklag OS: Phase 4 (Scaling & Self-Hosting)

To scale Ziklag OS to thousands of concurrent users (Social Media Managers, Developers, Clients) and ensure realtime functionality (like the synchronous Moodboard and Terminal operations) works seamlessly across multiple backend instances, we must transition to a containerized, load-balanced architecture.

## Architecture Upgrades included in this Release:

1. **Dockerized Environment**: The entire Next.js codebase, including the custom `server.ts` Express/Socket.io backend, has been containerized.
2. **Redis Pub/Sub for WebSockets**: By default, Socket.io manages connections in-memory. In a distributed environment, if User A connects to Server Instance 1 and User B connects to Server Instance 2, they won't share the same WebSocket room. We've integrated `@socket.io/redis-adapter` into `server.ts`. When `REDIS_URL` is detected, the OS automatically funnels all real-time events through Redis, unifying the cluster.

---

## Deployment Steps (Single Server/VPS via Docker Compose)

The easiest way to self-host to a standard VPS (AWS EC2, DigitalOcean Droplet, Hetzner) is via Docker Compose. 

1. Ensure Docker and Docker Compose are installed on your target machine.
2. Clone your exported codebase.
3. Add a `.env` file containing your production secrets (e.g., `GEMINI_API_KEY`).
4. Execute:
   ```bash
   docker-compose up -d --build
   ```

This spins up an internal Redis instance on port 6379 and your Ziklag OS web server on port 3000. 

---

## Deployment Steps (Kubernetes / Massive Scale)

To deploy to Kubernetes (e.g., Google Kubernetes Engine - GKE or Amazon EKS):

### 1. Build and Publish the Docker Image
```bash
docker build -t gcr.io/your-project-id/ziklag-os:latest .
docker push gcr.io/your-project-id/ziklag-os:latest
```

### 2. Stand up a Managed Redis Instance
Provision a highly available Redis instance (Google Cloud Memorystore, AWS ElastiCache) in your cluster's VPC. Note the internal redis connection string.

### 3. Kubernetes Deployment Configuration
Create a `deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ziklag-os
spec:
  replicas: 5 # Scale horizontally
  selector:
    matchLabels:
      app: ziklag-os
  template:
    metadata:
      labels:
        app: ziklag-os
    spec:
      containers:
      - name: ziklag-os
        image: gcr.io/your-project-id/ziklag-os:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: REDIS_URL
          value: "redis://<your-internal-redis-ip>:6379"
        # Mount API keys from Kubernetes Secrets here...
```

Apply to cluster:
```bash
kubectl apply -f deployment.yaml
```

### 4. Load Balancing WebSockets
Because Socket.io uses Long-Polling as a fallback to WebSockets, you must configure your Ingress / Load Balancer to utilize **Session Affinity (Sticky Sessions)**.

Example for standard Nginx Ingress:
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ziklag-os-ingress
  annotations:
    nginx.ingress.kubernetes.io/affinity: "cookie"
    nginx.ingress.kubernetes.io/session-cookie-name: "route"
spec:
  rules:
  - host: os.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: ziklag-os-service
            port: 
              number: 3000
```

With Sticky Sessions and Redis Adapter configured, Ziklag OS is fully capable of infinite horizontal scaling while maintaining real-time collaborative parity!
