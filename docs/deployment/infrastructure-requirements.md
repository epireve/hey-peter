# Infrastructure Requirements - HeyPeter Academy LMS

This document outlines the infrastructure requirements and recommendations for deploying HeyPeter Academy LMS across different environments and scales.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Minimum Requirements](#minimum-requirements)
3. [Recommended Configurations](#recommended-configurations)
4. [Scaling Guidelines](#scaling-guidelines)
5. [Cloud Provider Specifications](#cloud-provider-specifications)
6. [Network Architecture](#network-architecture)
7. [Security Infrastructure](#security-infrastructure)
8. [Monitoring Infrastructure](#monitoring-infrastructure)
9. [Backup Infrastructure](#backup-infrastructure)
10. [Cost Optimization](#cost-optimization)

## 🎯 Overview

HeyPeter Academy LMS is designed to scale from small deployments serving hundreds of users to large enterprise deployments serving tens of thousands of concurrent users.

### Architecture Tiers

1. **Development**: Single server, minimal resources
2. **Staging**: Reduced production mirror
3. **Production Small**: 100-1,000 concurrent users
4. **Production Medium**: 1,000-10,000 concurrent users
5. **Production Large**: 10,000+ concurrent users

## 📊 Minimum Requirements

### Development Environment

| Component | Specification | Purpose |
|-----------|--------------|---------|
| **CPU** | 2 vCPUs | Application + Database |
| **RAM** | 4 GB | Next.js + PostgreSQL |
| **Storage** | 20 GB SSD | Code + Database |
| **Network** | 100 Mbps | Development traffic |
| **OS** | Ubuntu 20.04+ | Container host |

```yaml
# docker-compose.yml for development
services:
  app:
    cpus: '1.5'
    mem_limit: 2g
  db:
    cpus: '0.5'
    mem_limit: 1g
```

### Staging Environment

| Component | Specification | Purpose |
|-----------|--------------|---------|
| **CPU** | 4 vCPUs | App + Services |
| **RAM** | 8 GB | Full stack |
| **Storage** | 50 GB SSD | Data + Logs |
| **Network** | 1 Gbps | Testing traffic |
| **OS** | Ubuntu 22.04 LTS | Stability |

### Production (Small)

| Component | Specification | Quantity | Total |
|-----------|--------------|----------|-------|
| **App Servers** | 2 vCPUs, 4 GB RAM | 2 | 4 vCPUs, 8 GB |
| **Database** | 4 vCPUs, 16 GB RAM | 1 | 4 vCPUs, 16 GB |
| **Redis** | 2 vCPUs, 4 GB RAM | 1 | 2 vCPUs, 4 GB |
| **Load Balancer** | 2 vCPUs, 2 GB RAM | 1 | 2 vCPUs, 2 GB |
| **Total** | - | - | 12 vCPUs, 30 GB |

## 🚀 Recommended Configurations

### Production Medium (1K-10K users)

```yaml
# Infrastructure as Code (Terraform example)
resource "aws_instance" "app_servers" {
  count         = 3
  instance_type = "t3.xlarge"  # 4 vCPUs, 16 GB RAM
  
  tags = {
    Name = "heypeter-app-${count.index + 1}"
    Role = "application"
  }
}

resource "aws_db_instance" "main" {
  instance_class       = "db.r6g.xlarge"  # 4 vCPUs, 32 GB RAM
  allocated_storage    = 500
  storage_type         = "gp3"
  engine              = "postgres"
  engine_version      = "15.5"
  multi_az            = true
}

resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "heypeter-redis"
  engine              = "redis"
  node_type           = "cache.r6g.large"  # 2 vCPUs, 13 GB RAM
  num_cache_nodes     = 3
  parameter_group_name = "default.redis7"
}
```

### Production Large (10K+ users)

| Service | Configuration | Instances | Notes |
|---------|--------------|-----------|-------|
| **Application** | 8 vCPUs, 32 GB RAM | 5-10 | Auto-scaling enabled |
| **Database Primary** | 16 vCPUs, 64 GB RAM | 1 | NVMe SSD storage |
| **Database Replicas** | 8 vCPUs, 32 GB RAM | 2-3 | Read replicas |
| **Redis Cluster** | 4 vCPUs, 16 GB RAM | 6 | 3 masters, 3 replicas |
| **Elasticsearch** | 8 vCPUs, 32 GB RAM | 3 | For search and analytics |
| **Load Balancers** | Managed ALB | 2 | Multi-AZ deployment |

### Kubernetes Configuration

```yaml
# k8s/production-resources.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: heypeter-quota
spec:
  hard:
    requests.cpu: "100"
    requests.memory: "200Gi"
    limits.cpu: "200"
    limits.memory: "400Gi"
    persistentvolumeclaims: "10"

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: heypeter-app
spec:
  replicas: 5
  template:
    spec:
      containers:
      - name: app
        resources:
          requests:
            memory: "4Gi"
            cpu: "2"
          limits:
            memory: "8Gi"
            cpu: "4"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

## 📈 Scaling Guidelines

### Horizontal Scaling

```bash
# User Growth Scaling Formula
# App Servers = ceil(concurrent_users / 500)
# Database Connections = concurrent_users * 1.5
# Redis Memory = concurrent_users * 0.1 MB
# Storage = users * 100 MB (average)
```

### Vertical Scaling Triggers

| Metric | Threshold | Action |
|--------|-----------|---------|
| CPU Usage | > 70% sustained | Add vCPUs or instances |
| Memory Usage | > 80% | Increase RAM |
| Response Time | > 500ms p95 | Scale up or optimize |
| Queue Depth | > 100 | Add workers |
| Error Rate | > 1% | Investigate and scale |

### Auto-Scaling Configuration

```hcl
# AWS Auto Scaling Group
resource "aws_autoscaling_group" "app" {
  min_size             = 3
  max_size             = 10
  desired_capacity     = 3
  target_group_arns    = [aws_lb_target_group.app.arn]
  
  target_tracking_scaling_policy {
    target_value = 70.0
    metric_type  = "Average"
    
    customized_metric_specification {
      metric_name = "CPUUtilization"
      namespace   = "AWS/EC2"
      statistic   = "Average"
    }
  }
}
```

## ☁️ Cloud Provider Specifications

### AWS Configuration

```hcl
# Complete AWS Infrastructure
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  
  name = "heypeter-vpc"
  cidr = "10.0.0.0/16"
  
  azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
  
  enable_nat_gateway = true
  enable_vpn_gateway = true
  enable_dns_hostnames = true
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "heypeter-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets           = module.vpc.public_subnets
  
  enable_deletion_protection = true
  enable_http2              = true
  enable_cross_zone_load_balancing = true
}

# RDS PostgreSQL
resource "aws_db_instance" "main" {
  identifier     = "heypeter-db"
  engine         = "postgres"
  engine_version = "15.5"
  instance_class = "db.r6g.xlarge"
  
  allocated_storage     = 500
  max_allocated_storage = 1000
  storage_encrypted     = true
  
  performance_insights_enabled = true
  monitoring_interval         = 60
  
  backup_retention_period = 30
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
}
```

### Google Cloud Platform

```yaml
# GCP Deployment Manager
resources:
- name: heypeter-instance-template
  type: compute.v1.instanceTemplate
  properties:
    properties:
      machineType: n2-standard-4
      disks:
      - boot: true
        autoDelete: true
        initializeParams:
          sourceImage: projects/ubuntu-os-cloud/global/images/family/ubuntu-2204-lts
          diskSizeGb: 100
      networkInterfaces:
      - network: global/networks/default
        accessConfigs:
        - type: ONE_TO_ONE_NAT
          name: External NAT

- name: heypeter-mig
  type: compute.v1.instanceGroupManager
  properties:
    baseInstanceName: heypeter-app
    instanceTemplate: $(ref.heypeter-instance-template.selfLink)
    targetSize: 3
    autoHealingPolicies:
    - healthCheck: $(ref.heypeter-health-check.selfLink)
      initialDelaySec: 300
```

### Azure Configuration

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "resources": [
    {
      "type": "Microsoft.Compute/virtualMachineScaleSets",
      "apiVersion": "2021-07-01",
      "name": "heypeter-vmss",
      "location": "[resourceGroup().location]",
      "sku": {
        "name": "Standard_D4s_v3",
        "capacity": 3
      },
      "properties": {
        "upgradePolicy": {
          "mode": "Rolling"
        },
        "virtualMachineProfile": {
          "osProfile": {
            "computerNamePrefix": "heypeter",
            "adminUsername": "azureuser"
          },
          "storageProfile": {
            "osDisk": {
              "createOption": "FromImage",
              "diskSizeGB": 100
            }
          }
        }
      }
    }
  ]
}
```

## 🌐 Network Architecture

### Network Topology

```
Internet
    │
    ├── CloudFlare CDN
    │
    ├── AWS Route 53 (DNS)
    │
    └── Application Load Balancer
            │
            ├── Public Subnet (10.0.101.0/24)
            │   └── NAT Gateway
            │
            ├── Private Subnet - Apps (10.0.1.0/24)
            │   ├── App Server 1
            │   ├── App Server 2
            │   └── App Server N
            │
            ├── Private Subnet - Data (10.0.2.0/24)
            │   ├── RDS Primary
            │   ├── RDS Replica
            │   └── Redis Cluster
            │
            └── Private Subnet - Monitoring (10.0.3.0/24)
                ├── Prometheus
                ├── Grafana
                └── ELK Stack
```

### Security Groups

```hcl
# Application Security Group
resource "aws_security_group" "app" {
  name_prefix = "heypeter-app-"
  vpc_id      = module.vpc.vpc_id
  
  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Database Security Group
resource "aws_security_group" "database" {
  name_prefix = "heypeter-db-"
  vpc_id      = module.vpc.vpc_id
  
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }
}
```

## 🔒 Security Infrastructure

### WAF Configuration

```hcl
resource "aws_wafv2_web_acl" "main" {
  name  = "heypeter-waf"
  scope = "REGIONAL"
  
  default_action {
    allow {}
  }
  
  rule {
    name     = "RateLimitRule"
    priority = 1
    
    action {
      block {}
    }
    
    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }
  }
  
  rule {
    name     = "SQLiRule"
    priority = 2
    
    action {
      block {}
    }
    
    statement {
      sqli_match_statement {
        field_to_match {
          body {}
        }
        text_transformation {
          priority = 0
          type     = "URL_DECODE"
        }
      }
    }
  }
}
```

### Certificate Management

```bash
# Let's Encrypt with Certbot
certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials ~/.cloudflare.ini \
  -d heypeter-academy.com \
  -d '*.heypeter-academy.com'

# AWS Certificate Manager
aws acm request-certificate \
  --domain-name heypeter-academy.com \
  --subject-alternative-names '*.heypeter-academy.com' \
  --validation-method DNS
```

## 📊 Monitoring Infrastructure

### Metrics Collection

```yaml
# Prometheus Configuration
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'production'
    region: 'us-east-1'

scrape_configs:
  - job_name: 'node-exporter'
    ec2_sd_configs:
      - region: us-east-1
        port: 9100
        filters:
          - name: tag:Role
            values: ['application', 'database']
    
  - job_name: 'app-metrics'
    kubernetes_sd_configs:
      - role: pod
        namespaces:
          names: ['heypeter']
```

### Log Aggregation

```yaml
# ELK Stack Configuration
version: '3.8'
services:
  elasticsearch:
    image: elasticsearch:8.11.0
    environment:
      - cluster.name=heypeter-logs
      - discovery.type=multi-node
      - "ES_JAVA_OPTS=-Xms4g -Xmx4g"
    volumes:
      - esdata:/usr/share/elasticsearch/data
    deploy:
      resources:
        limits:
          memory: 8G
          cpus: '4'
  
  logstash:
    image: logstash:8.11.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 4G
          cpus: '2'
  
  kibana:
    image: kibana:8.11.0
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1'
```

## 💾 Backup Infrastructure

### Backup Strategy

```bash
# Automated Backup Script
#!/bin/bash

# Database Backups
BACKUP_RETENTION_DAYS=30
BACKUP_BUCKET="heypeter-backups"

# Full backup daily
pg_dump $DATABASE_URL | gzip | aws s3 cp - \
  s3://$BACKUP_BUCKET/daily/$(date +%Y%m%d).sql.gz

# Incremental backup hourly (WAL archiving)
archive_command = 'aws s3 cp %p s3://heypeter-backups/wal/%f'

# Application data backup
aws s3 sync /app/uploads s3://$BACKUP_BUCKET/uploads/ \
  --delete --storage-class STANDARD_IA

# Retention policy
aws s3api put-bucket-lifecycle-configuration \
  --bucket $BACKUP_BUCKET \
  --lifecycle-configuration file://backup-lifecycle.json
```

### Disaster Recovery

| Component | RPO | RTO | Method |
|-----------|-----|-----|---------|
| Database | 1 hour | 2 hours | Automated snapshots + WAL |
| Application | Real-time | 5 minutes | Multi-region deployment |
| User Files | 1 hour | 1 hour | S3 cross-region replication |
| Configuration | Real-time | 15 minutes | Git + Secrets Manager |

## 💰 Cost Optimization

### Resource Right-Sizing

```python
# analyze_usage.py
import boto3
import pandas as pd
from datetime import datetime, timedelta

def analyze_instance_usage():
    cloudwatch = boto3.client('cloudwatch')
    ec2 = boto3.client('ec2')
    
    instances = ec2.describe_instances()
    recommendations = []
    
    for reservation in instances['Reservations']:
        for instance in reservation['Instances']:
            instance_id = instance['InstanceId']
            instance_type = instance['InstanceType']
            
            # Get CPU metrics
            cpu_metrics = cloudwatch.get_metric_statistics(
                Namespace='AWS/EC2',
                MetricName='CPUUtilization',
                Dimensions=[{'Name': 'InstanceId', 'Value': instance_id}],
                StartTime=datetime.now() - timedelta(days=7),
                EndTime=datetime.now(),
                Period=3600,
                Statistics=['Average']
            )
            
            avg_cpu = sum(p['Average'] for p in cpu_metrics['Datapoints']) / len(cpu_metrics['Datapoints'])
            
            if avg_cpu < 20:
                recommendations.append({
                    'InstanceId': instance_id,
                    'CurrentType': instance_type,
                    'AvgCPU': avg_cpu,
                    'Recommendation': 'Downsize or use Spot instances'
                })
    
    return pd.DataFrame(recommendations)
```

### Cost Monitoring

```yaml
# AWS Budget Alert
Type: AWS::Budgets::Budget
Properties:
  Budget:
    BudgetName: HeyPeter-Monthly-Budget
    BudgetLimit:
      Amount: 5000
      Unit: USD
    TimeUnit: MONTHLY
    BudgetType: COST
    
  NotificationsWithSubscribers:
    - Notification:
        NotificationType: ACTUAL
        ComparisonOperator: GREATER_THAN
        Threshold: 80
        ThresholdType: PERCENTAGE
      Subscribers:
        - SubscriptionType: EMAIL
          Address: finance@heypeter-academy.com
```

### Optimization Strategies

1. **Reserved Instances**: 40-60% savings for predictable workloads
2. **Spot Instances**: 70-90% savings for fault-tolerant workloads
3. **Auto-shutdown**: Stop dev/staging environments outside hours
4. **Right-sizing**: Use AWS Compute Optimizer recommendations
5. **Storage tiering**: Move old data to Glacier
6. **CDN caching**: Reduce origin requests

## 📋 Infrastructure Checklist

### Pre-Production
- [ ] VPC and networking configured
- [ ] Security groups defined
- [ ] SSL certificates provisioned
- [ ] DNS records configured
- [ ] Load balancers deployed
- [ ] Auto-scaling configured
- [ ] Monitoring agents installed
- [ ] Backup strategy implemented

### Production Launch
- [ ] All services health-checked
- [ ] Monitoring dashboards configured
- [ ] Alerts and notifications set
- [ ] Backup verification completed
- [ ] Disaster recovery tested
- [ ] Security scan completed
- [ ] Performance baselines established
- [ ] Cost tracking enabled

### Ongoing Maintenance
- [ ] Weekly backup verification
- [ ] Monthly security patches
- [ ] Quarterly DR drills
- [ ] Annual architecture review
- [ ] Continuous cost optimization
- [ ] Regular performance tuning

---

*Last updated: January 2025*