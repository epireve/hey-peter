# HeyPeter Academy LMS - Production Deployment

This directory contains all the necessary configurations, scripts, and documentation for deploying the HeyPeter Academy Learning Management System to production.

## Quick Start

For a complete production deployment, run:

```bash
./scripts/deploy-full-stack.sh production your-domain.com your-s3-bucket admin@your-domain.com
```

## Directory Structure

```
deployment/
├── environments/           # Environment-specific configurations
│   ├── production.env.example
│   ├── staging.env.example
│   └── docker-compose.production.yml
├── scripts/               # Deployment automation scripts
│   ├── deploy-full-stack.sh      # Complete deployment orchestration
│   ├── deploy-database.sh        # Database migration and setup
│   └── seed-production-data.sh   # Production data seeding
├── ssl/                   # SSL certificate management
│   ├── setup-ssl.sh             # SSL certificate automation
│   └── nginx-ssl.conf           # SSL configuration for Nginx
├── cdn/                   # CDN and static asset configuration
│   ├── setup-cdn.sh             # CloudFront CDN setup
│   └── cloudfront-config.json   # CDN configuration template
├── load-balancer/         # Load balancing and scaling
│   ├── setup-lb.sh              # Load balancer deployment
│   ├── nginx.conf               # Nginx configuration
│   ├── haproxy.cfg              # HAProxy configuration
│   └── docker-compose.lb.yml    # Load balancer containers
├── monitoring/            # Monitoring and alerting
│   ├── setup-monitoring.sh      # Monitoring stack deployment
│   ├── prometheus.yml           # Prometheus configuration
│   ├── alert_rules.yml          # Alert definitions
│   └── docker-compose.monitoring.yml
├── backup/               # Backup and recovery
│   ├── setup-backup.sh         # Backup system setup
│   ├── backup-manager.sh       # Backup operations
│   └── backup-config.yml       # Backup configuration
├── reports/              # Deployment reports and logs
└── PRODUCTION_DEPLOYMENT_GUIDE.md  # Comprehensive deployment guide
```

## Deployment Components

### 1. Application Layer
- **Technology**: Next.js 14 with React 18
- **Containerization**: Docker with multi-stage builds
- **Scaling**: Horizontal scaling with load balancers
- **Health Checks**: Built-in health endpoints

### 2. Database Layer
- **Database**: Supabase PostgreSQL
- **Security**: Row Level Security (RLS) policies
- **Backups**: Automated daily backups with retention policies
- **Monitoring**: Performance metrics and query analysis

### 3. Load Balancer
- **Primary**: Nginx with SSL termination
- **Secondary**: HAProxy for advanced load balancing
- **Features**: Rate limiting, caching, health checks
- **SSL**: Let's Encrypt certificates with auto-renewal

### 4. CDN and Static Assets
- **CDN**: Amazon CloudFront
- **Storage**: S3 buckets for static assets
- **Optimization**: Compression, caching, and edge locations
- **Security**: Origin access identity and signed URLs

### 5. Monitoring and Alerting
- **Metrics**: Prometheus with custom application metrics
- **Visualization**: Grafana dashboards
- **Alerting**: Email and Slack notifications
- **Logging**: Centralized logging with Loki
- **Tracing**: Distributed tracing with Jaeger

### 6. Backup and Recovery
- **Database Backups**: Daily automated backups
- **File Backups**: Application files and configurations
- **Storage**: Local and cloud storage options
- **Testing**: Automated backup integrity verification

## Deployment Process

### Prerequisites
- [ ] Linux server (Ubuntu 20.04+ recommended)
- [ ] Domain name with DNS access
- [ ] Supabase account and project
- [ ] AWS account (for CDN and backups)
- [ ] Email service (SMTP)
- [ ] Slack workspace (for alerts)

### Step-by-Step Deployment

1. **Environment Setup**
   ```bash
   # Clone repository
   git clone https://github.com/your-org/hey-peter.git
   cd hey-peter
   
   # Copy environment template
   cp deployment/environments/production.env.example deployment/environments/.env.production
   
   # Edit with your values
   nano deployment/environments/.env.production
   ```

2. **Prerequisites Installation**
   ```bash
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   
   # Install required tools
   sudo apt-get update
   sudo apt-get install -y postgresql-client nginx certbot
   
   # Install AWS CLI
   curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
   unzip awscliv2.zip && sudo ./aws/install
   
   # Configure AWS
   aws configure
   ```

3. **Full Stack Deployment**
   ```bash
   # Run complete deployment
   ./deployment/scripts/deploy-full-stack.sh production your-domain.com your-s3-bucket admin@your-domain.com
   ```

4. **Post-Deployment Verification**
   ```bash
   # Test application
   curl https://your-domain.com/health
   
   # Access monitoring
   # Grafana: http://your-server:3001 (admin/heypeter-admin-2025)
   # Prometheus: http://your-server:9090
   ```

### Individual Component Deployment

If you prefer to deploy components individually:

```bash
# Database deployment
./deployment/scripts/deploy-database.sh production

# SSL certificates
./deployment/ssl/setup-ssl.sh your-domain.com admin@your-domain.com letsencrypt

# CDN setup
./deployment/cdn/setup-cdn.sh production false your-domain.com your-s3-bucket

# Load balancer
./deployment/load-balancer/setup-lb.sh production nginx 3

# Monitoring
./deployment/monitoring/setup-monitoring.sh production full

# Backup system
./deployment/backup/setup-backup.sh production s3
```

## Configuration Files

### Environment Variables
Key environment variables that must be configured:

```bash
# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Database
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Email
EMAIL_SERVER_HOST=smtp.your-provider.com
EMAIL_SERVER_USER=your-username
EMAIL_SERVER_PASSWORD=your-password

# Monitoring
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your-webhook
```

### SSL Configuration
SSL certificates are automatically managed with Let's Encrypt:
- Automatic certificate generation
- Auto-renewal via cron jobs
- OCSP stapling for performance
- Modern cipher suites

### Load Balancer Configuration
- **Nginx**: Primary load balancer with SSL termination
- **HAProxy**: Advanced load balancing with health checks
- **Rate Limiting**: Configurable per endpoint
- **Caching**: Static asset caching and API response caching

## Monitoring and Alerting

### Dashboards
Pre-configured Grafana dashboards for:
- Application performance metrics
- System resource utilization
- Database performance
- Business metrics (user activity, course enrollments)

### Alerts
Automated alerts for:
- Application downtime
- High error rates
- Resource exhaustion
- SSL certificate expiry
- Backup failures

### Health Checks
- Application health endpoints
- Database connectivity
- External service availability
- SSL certificate validity

## Backup and Recovery

### Backup Strategy
- **Database**: Daily backups with 7-day local retention
- **Files**: Application files and configurations
- **Cloud Storage**: S3 with lifecycle policies
- **Testing**: Weekly restore testing

### Recovery Procedures
- Point-in-time database recovery
- Application rollback procedures
- Disaster recovery planning
- RTO: 4 hours, RPO: 1 hour

## Security

### Network Security
- UFW firewall configuration
- VPN access for management
- Rate limiting and DDoS protection
- Security headers

### Application Security
- HTTPS enforcement
- Content Security Policy
- XSS and CSRF protection
- Input validation and sanitization

### Database Security
- Row Level Security (RLS) policies
- Encrypted connections
- Audit logging
- Regular security updates

## Scaling

### Horizontal Scaling
- Load-balanced application instances
- Database read replicas
- CDN edge locations
- Auto-scaling groups (if using cloud platforms)

### Vertical Scaling
- Resource monitoring and alerting
- Performance optimization
- Database tuning
- Caching strategies

## Troubleshooting

### Common Issues
1. **Application Won't Start**
   - Check environment variables
   - Verify database connectivity
   - Review Docker logs

2. **SSL Certificate Issues**
   - Verify domain DNS records
   - Check Let's Encrypt rate limits
   - Validate certificate chain

3. **Performance Issues**
   - Monitor resource usage
   - Check database performance
   - Analyze slow queries

### Log Locations
- Application logs: `docker logs [container-name]`
- Nginx logs: `/var/log/nginx/`
- System logs: `/var/log/syslog`
- Deployment logs: `deployment/reports/`

### Support Contacts
- **Technical Support**: devops@heypeter-academy.com
- **Emergency**: +1-xxx-xxx-xxxx
- **Slack**: #production-support

## Maintenance

### Regular Tasks
- **Daily**: Monitor system health and error logs
- **Weekly**: Review performance metrics and test backups
- **Monthly**: Security updates and capacity planning
- **Quarterly**: Disaster recovery testing

### Update Procedures
- Application updates via rolling deployment
- Database migrations with downtime planning
- Security patches with change management
- Infrastructure updates with testing

## Additional Resources

- [Production Deployment Guide](./PRODUCTION_DEPLOYMENT_GUIDE.md) - Comprehensive deployment instructions
- [Architecture Documentation](../docs/architecture.md) - System architecture overview
- [API Documentation](../docs/api.md) - API reference and usage
- [Security Guidelines](../docs/security.md) - Security best practices
- [Performance Optimization](../docs/performance.md) - Performance tuning guide

## Getting Help

If you encounter issues during deployment:

1. Check the troubleshooting section above
2. Review deployment logs in `deployment/reports/`
3. Contact the DevOps team at devops@heypeter-academy.com
4. Join the #production-support Slack channel

For emergency issues, use the emergency contact number provided above.

---

**Last Updated**: January 2025
**Version**: 1.0.0
**Maintainer**: DevOps Team