# Grafana Monitoring (Easy Step‑by‑Step)

This guide helps you get **end‑to‑end monitoring** working quickly with Prometheus + Grafana for:
- **Frontend / Nginx traffic**
- **Containers (Docker / cAdvisor)**
- **System (Node Exporter)**
- *(Optional)* Databases (Postgres + MySQL)
- *(Optional)* Keycloak auth
- **Prometheus & Grafana health**

You already have most of the stack running. Follow these steps to finish and use the dashboard.

---

## 0) Prerequisites (what you already have)
From your `docker ps`, you’re running:
- **Prometheus** (`prometheus:9090`)
- **Grafana** (`grafana:3000`)
- **Node Exporter** (`node-exporter:9100`)
- **cAdvisor** (`cadvisor:8080` – host mapped to 8081)
- **Nginx Prometheus Exporter** (`nginx-exporter:9113`)
- **Nginx servers**, **BFF**, **layer-api**, **Postgres**, **MySQL**, **Keycloak**

> Make sure all containers are on the same Docker network as Prometheus so scraping works by **container name + port**.

---

## 1) (Optional) Add Database Exporters

### Postgres
```bash
docker run -d --name postgres-exporter \
  --network <your_network> \
  -e DATA_SOURCE_NAME="postgresql://postgres:<PASSWORD>@layer-db:5432/postgres?sslmode=disable" \
  -p 9187:9187 \
  quay.io/prometheuscommunity/postgres-exporter
```

### MySQL
```bash
docker run -d --name mysqld-exporter \
  --network <your_network> \
  -e DATA_SOURCE_NAME="root:<PASSWORD>@(keycloak-mysql:3306)/" \
  -p 9104:9104 \
  prom/mysqld-exporter
```

> Replace `<your_network>` and `<PASSWORD>`. Use your existing container names (`layer-db`, `keycloak-mysql`).

---

## 2) (Optional) Enable Keycloak metrics
Keycloak 24 supports Prometheus metrics. Recreate your Keycloak container with:
```bash
docker run -d --name keycloak-server \
  -e KC_METRICS_ENABLED=true \
  -e KC_HTTP_ENABLED=true \
  -p 8080:8080 \
  quay.io/keycloak/keycloak:24.0.3 start
```
Then Prometheus can scrape `keycloak-server:8080/metrics` (internal network).

> If you use docker-compose, add `KC_METRICS_ENABLED=true` to `environment:` and `start` command.

---

## 3) Add scrape jobs to Prometheus

Open the Prometheus config in your Prometheus container (usually `/etc/prometheus/prometheus.yml`) and add jobs like these:

```yaml
scrape_configs:
  - job_name: prometheus
    static_configs:
      - targets: ["prometheus:9090"]

  - job_name: grafana               # (enable Grafana metrics first, see note below)
    metrics_path: /metrics
    static_configs:
      - targets: ["grafana:3000"]

  - job_name: node-exporter
    static_configs:
      - targets: ["node-exporter:9100"]

  - job_name: cadvisor
    static_configs:
      - targets: ["cadvisor:8080"]

  - job_name: nginx
    static_configs:
      - targets: ["nginx-exporter:9113"]

  # Optional: databases
  - job_name: postgres
    static_configs:
      - targets: ["postgres-exporter:9187"]

  - job_name: mysql
    static_configs:
      - targets: ["mysqld-exporter:9104"]

  # Optional: Keycloak
  - job_name: keycloak
    metrics_path: /metrics
    static_configs:
      - targets: ["keycloak-server:8080"]
```

> **Grafana metrics:** set `GF_METRICS_ENABLED=true` in Grafana env to expose `/metrics`.

**Reload Prometheus** to apply changes (no full restart needed):
```bash
docker kill -s HUP prometheus
```

---

## 4) Add Grafana Prometheus data source (one‑time)

In Grafana → **Connections → Data sources → Add data source → Prometheus**  
- URL: `http://prometheus:9090` (if Grafana shares the Docker network)  
- Save & test

---

## 5) Import the Dashboard JSON (below)

Grafana → **Dashboards → New → Import → Upload JSON**  
Upload the JSON from the **“Dashboard JSON (import me)”** section at the end of this file.

> This dashboard shows **Frontend/Nginx first**, then **Containers**, then **System**, and includes **Prometheus/Grafana health**.

---

## 6) Use it
- Set time range (top‑right) to **Last 12 hours** or **Last 1 hour**
- Hover charts to see per‑series values
- Click legend items to hide/show series
- Save the dashboard and **star** it

---

## 7) (Optional) Quick alerts to start with

> Grafana → Alerting → Alert rules → **Create** and use these expressions.

**A. High CPU (85% for 5m)**
```
100 - (avg by(instance)(irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 85
```

**B. Nginx 5xx spike (rate > 1/s for 5m)**
```
rate(nginx_http_requests_total{status=~"5.."}[5m]) > 1
```

**C. Container restart detected (in last 5m)**
```
changes(container_last_seen[5m]) > 0
```

---

## Troubleshooting

- **No Nginx metrics:** Confirm `nginx-exporter:9113/metrics` is reachable and your exporter is correctly configured against Nginx status endpoints.  
- **Container names look weird:** That’s normal from cAdvisor (labels + long names). You can use Grafana **transformations** or regex in legends to shorten.  
- **No Grafana/Keycloak metrics:** Ensure the env flags above are set and containers recreated.  
- **Permissions:** For DB exporters, make sure credentials allow read access to stats.  

---

## Dashboard JSON (import me)

> Copy‑paste everything below into Grafana’s Import dialog.

```json
{
  "annotations": {
    "list": [
      {
        "builtIn": 1,
        "datasource": {
          "type": "grafana",
          "uid": "-- Grafana --"
        },
        "enable": true,
        "hide": true,
        "iconColor": "rgba(0, 211, 255, 1)",
        "name": "Annotations & Alerts",
        "type": "dashboard"
      }
    ]
  },
  "editable": true,
  "fiscalYearStartMonth": 0,
  "graphTooltip": 0,
  "id": 8,
  "links": [],
  "panels": [
    {
      "collapsed": false,
      "gridPos": {
        "h": 1,
        "w": 24,
        "x": 0,
        "y": 0
      },
      "id": 1,
      "panels": [],
      "title": "System Metrics",
      "type": "row"
    },
    {
      "fieldConfig": {
        "defaults": {
          "color": {
            "mode": "palette-classic"
          },
          "custom": {
            "axisBorderShow": false,
            "axisCenteredZero": false,
            "axisColorMode": "text",
            "axisLabel": "",
            "axisPlacement": "auto",
            "barAlignment": 0,
            "barWidthFactor": 0.6,
            "drawStyle": "line",
            "fillOpacity": 0,
            "gradientMode": "none",
            "hideFrom": {
              "legend": false,
              "tooltip": false,
              "viz": false
            },
            "insertNulls": false,
            "lineInterpolation": "linear",
            "lineWidth": 1,
            "pointSize": 5,
            "scaleDistribution": {
              "type": "linear"
            },
            "showPoints": "auto",
            "spanNulls": false,
            "stacking": {
              "group": "A",
              "mode": "none"
            },
            "thresholdsStyle": {
              "mode": "off"
            }
          },
          "mappings": [],
          "thresholds": {
            "mode": "absolute",
            "steps": [
              {
                "color": "green",
                "value": 0
              },
              {
                "color": "red",
                "value": 80
              }
            ]
          }
        },
        "overrides": []
      },
      "gridPos": {
        "h": 8,
        "w": 12,
        "x": 0,
        "y": 1
      },
      "id": 2,
      "options": {
        "legend": {
          "calcs": [],
          "displayMode": "list",
          "placement": "bottom",
          "showLegend": true
        },
        "tooltip": {
          "hideZeros": false,
          "mode": "single",
          "sort": "none"
        }
      },
      "pluginVersion": "12.1.1",
      "targets": [
        {
          "expr": "100 - (avg by(instance)(irate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)",
          "legendFormat": "{{instance}}",
          "refId": "A"
        }
      ],
      "title": "CPU Usage %",
      "type": "timeseries"
    },
    {
      "fieldConfig": {
        "defaults": {
          "color": {
            "mode": "palette-classic"
          },
          "custom": {
            "axisBorderShow": false,
            "axisCenteredZero": false,
            "axisColorMode": "text",
            "axisLabel": "",
            "axisPlacement": "auto",
            "barAlignment": 0,
            "barWidthFactor": 0.6,
            "drawStyle": "line",
            "fillOpacity": 0,
            "gradientMode": "none",
            "hideFrom": {
              "legend": false,
              "tooltip": false,
              "viz": false
            },
            "insertNulls": false,
            "lineInterpolation": "linear",
            "lineWidth": 1,
            "pointSize": 5,
            "scaleDistribution": {
              "type": "linear"
            },
            "showPoints": "auto",
            "spanNulls": false,
            "stacking": {
              "group": "A",
              "mode": "none"
            },
            "thresholdsStyle": {
              "mode": "off"
            }
          },
          "mappings": [],
          "thresholds": {
            "mode": "absolute",
            "steps": [
              {
                "color": "green",
                "value": 0
              },
              {
                "color": "red",
                "value": 80
              }
            ]
          }
        },
        "overrides": []
      },
      "gridPos": {
        "h": 8,
        "w": 12,
        "x": 12,
        "y": 1
      },
      "id": 3,
      "options": {
        "legend": {
          "calcs": [],
          "displayMode": "list",
          "placement": "bottom",
          "showLegend": true
        },
        "tooltip": {
          "hideZeros": false,
          "mode": "single",
          "sort": "none"
        }
      },
      "pluginVersion": "12.1.1",
      "targets": [
        {
          "expr": "(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100",
          "legendFormat": "{{instance}}",
          "refId": "A"
        }
      ],
      "title": "Memory Usage %",
      "type": "timeseries"
    },
    {
      "fieldConfig": {
        "defaults": {
          "color": {
            "mode": "palette-classic"
          },
          "custom": {
            "axisBorderShow": false,
            "axisCenteredZero": false,
            "axisColorMode": "text",
            "axisLabel": "",
            "axisPlacement": "auto",
            "barAlignment": 0,
            "barWidthFactor": 0.6,
            "drawStyle": "line",
            "fillOpacity": 0,
            "gradientMode": "none",
            "hideFrom": {
              "legend": false,
              "tooltip": false,
              "viz": false
            },
            "insertNulls": false,
            "lineInterpolation": "linear",
            "lineWidth": 1,
            "pointSize": 5,
            "scaleDistribution": {
              "type": "linear"
            },
            "showPoints": "auto",
            "spanNulls": false,
            "stacking": {
              "group": "A",
              "mode": "none"
            },
            "thresholdsStyle": {
              "mode": "off"
            }
          },
          "mappings": [],
          "thresholds": {
            "mode": "absolute",
            "steps": [
              {
                "color": "green",
                "value": 0
              },
              {
                "color": "red",
                "value": 80
              }
            ]
          }
        },
        "overrides": []
      },
      "gridPos": {
        "h": 8,
        "w": 12,
        "x": 0,
        "y": 9
      },
      "id": 4,
      "options": {
        "legend": {
          "calcs": [],
          "displayMode": "list",
          "placement": "bottom",
          "showLegend": true
        },
        "tooltip": {
          "hideZeros": false,
          "mode": "single",
          "sort": "none"
        }
      },
      "pluginVersion": "12.1.1",
      "targets": [
        {
          "expr": "(node_filesystem_size_bytes{fstype!=\"tmpfs\"} - node_filesystem_free_bytes{fstype!=\"tmpfs\"}) / node_filesystem_size_bytes{fstype!=\"tmpfs\"} * 100",
          "legendFormat": "{{mountpoint}}",
          "refId": "A"
        }
      ],
      "title": "Disk Usage %",
      "type": "timeseries"
    },
    {
      "fieldConfig": {
        "defaults": {
          "color": {
            "mode": "palette-classic"
          },
          "custom": {
            "axisBorderShow": false,
            "axisCenteredZero": false,
            "axisColorMode": "text",
            "axisLabel": "",
            "axisPlacement": "auto",
            "barAlignment": 0,
            "barWidthFactor": 0.6,
            "drawStyle": "line",
            "fillOpacity": 0,
            "gradientMode": "none",
            "hideFrom": {
              "legend": false,
              "tooltip": false,
              "viz": false
            },
            "insertNulls": false,
            "lineInterpolation": "linear",
            "lineWidth": 1,
            "pointSize": 5,
            "scaleDistribution": {
              "type": "linear"
            },
            "showPoints": "auto",
            "spanNulls": false,
            "stacking": {
              "group": "A",
              "mode": "none"
            },
            "thresholdsStyle": {
              "mode": "off"
            }
          },
          "mappings": [],
          "thresholds": {
            "mode": "absolute",
            "steps": [
              {
                "color": "green",
                "value": 0
              },
              {
                "color": "red",
                "value": 80
              }
            ]
          }
        },
        "overrides": []
      },
      "gridPos": {
        "h": 8,
        "w": 12,
        "x": 12,
        "y": 9
      },
      "id": 5,
      "options": {
        "legend": {
          "calcs": [],
          "displayMode": "list",
          "placement": "bottom",
          "showLegend": true
        },
        "tooltip": {
          "hideZeros": false,
          "mode": "single",
          "sort": "none"
        }
      },
      "pluginVersion": "12.1.1",
      "targets": [
        {
          "expr": "irate(node_network_receive_bytes_total[5m])",
          "legendFormat": "{{device}} RX",
          "refId": "A"
        },
        {
          "expr": "irate(node_network_transmit_bytes_total[5m])",
          "legendFormat": "{{device}} TX",
          "refId": "B"
        }
      ],
      "title": "Network Traffic",
      "type": "timeseries"
    },
    {
      "collapsed": false,
      "gridPos": {
        "h": 1,
        "w": 24,
        "x": 0,
        "y": 17
      },
      "id": 6,
      "panels": [],
      "title": "Containers Metrics",
      "type": "row"
    },
    {
      "fieldConfig": {
        "defaults": {
          "color": {
            "mode": "palette-classic"
          },
          "custom": {
            "axisBorderShow": false,
            "axisCenteredZero": false,
            "axisColorMode": "text",
            "axisLabel": "",
            "axisPlacement": "auto",
            "barAlignment": 0,
            "barWidthFactor": 0.6,
            "drawStyle": "line",
            "fillOpacity": 0,
            "gradientMode": "none",
            "hideFrom": {
              "legend": false,
              "tooltip": false,
              "viz": false
            },
            "insertNulls": false,
            "lineInterpolation": "linear",
            "lineWidth": 1,
            "pointSize": 5,
            "scaleDistribution": {
              "type": "linear"
            },
            "showPoints": "auto",
            "spanNulls": false,
            "stacking": {
              "group": "A",
              "mode": "none"
            },
            "thresholdsStyle": {
              "mode": "off"
            }
          },
          "mappings": [],
          "thresholds": {
            "mode": "absolute",
            "steps": [
              {
                "color": "green",
                "value": 0
              },
              {
                "color": "red",
                "value": 80
              }
            ]
          }
        },
        "overrides": []
      },
      "gridPos": {
        "h": 8,
        "w": 12,
        "x": 0,
        "y": 18
      },
      "id": 7,
      "options": {
        "legend": {
          "calcs": [],
          "displayMode": "list",
          "placement": "bottom",
          "showLegend": true
        },
        "tooltip": {
          "hideZeros": false,
          "mode": "single",
          "sort": "none"
        }
      },
      "pluginVersion": "12.1.1",
      "targets": [
        {
          "expr": "rate(container_cpu_usage_seconds_total[5m]) * 100",
          "legendFormat": "{{container}}",
          "refId": "A"
        }
      ],
      "title": "Container CPU %",
      "type": "timeseries"
    },
    {
      "fieldConfig": {
        "defaults": {
          "color": {
            "mode": "palette-classic"
          },
          "custom": {
            "axisBorderShow": false,
            "axisCenteredZero": false,
            "axisColorMode": "text",
            "axisLabel": "",
            "axisPlacement": "auto",
            "barAlignment": 0,
            "barWidthFactor": 0.6,
            "drawStyle": "line",
            "fillOpacity": 0,
            "gradientMode": "none",
            "hideFrom": {
              "legend": false,
              "tooltip": false,
              "viz": false
            },
            "insertNulls": false,
            "lineInterpolation": "linear",
            "lineWidth": 1,
            "pointSize": 5,
            "scaleDistribution": {
              "type": "linear"
            },
            "showPoints": "auto",
            "spanNulls": false,
            "stacking": {
              "group": "A",
              "mode": "none"
            },
            "thresholdsStyle": {
              "mode": "off"
            }
          },
          "mappings": [],
          "thresholds": {
            "mode": "absolute",
            "steps": [
              {
                "color": "green",
                "value": 0
              },
              {
                "color": "red",
                "value": 80
              }
            ]
          }
        },
        "overrides": []
      },
      "gridPos": {
        "h": 8,
        "w": 12,
        "x": 12,
        "y": 18
      },
      "id": 8,
      "options": {
        "legend": {
          "calcs": [],
          "displayMode": "list",
          "placement": "bottom",
          "showLegend": true
        },
        "tooltip": {
          "hideZeros": false,
          "mode": "single",
          "sort": "none"
        }
      },
      "pluginVersion": "12.1.1",
      "targets": [
        {
          "expr": "container_memory_usage_bytes",
          "legendFormat": "{{container}}",
          "refId": "A"
        }
      ],
      "title": "Container Memory Usage",
      "type": "timeseries"
    },
    {
      "fieldConfig": {
        "defaults": {
          "color": {
            "mode": "palette-classic"
          },
          "custom": {
            "axisBorderShow": false,
            "axisCenteredZero": false,
            "axisColorMode": "text",
            "axisLabel": "",
            "axisPlacement": "auto",
            "barAlignment": 0,
            "barWidthFactor": 0.6,
            "drawStyle": "line",
            "fillOpacity": 0,
            "gradientMode": "none",
            "hideFrom": {
              "legend": false,
              "tooltip": false,
              "viz": false
            },
            "insertNulls": false,
            "lineInterpolation": "linear",
            "lineWidth": 1,
            "pointSize": 5,
            "scaleDistribution": {
              "type": "linear"
            },
            "showPoints": "auto",
            "spanNulls": false,
            "stacking": {
              "group": "A",
              "mode": "none"
            },
            "thresholdsStyle": {
              "mode": "off"
            }
          },
          "mappings": [],
          "thresholds": {
            "mode": "absolute",
            "steps": [
              {
                "color": "green",
                "value": 0
              },
              {
                "color": "red",
                "value": 80
              }
            ]
          }
        },
        "overrides": [
          {
            "__systemRef": "hideSeriesFrom",
            "matcher": {
              "id": "byNames",
              "options": {
                "mode": "exclude",
                "names": [
                  "{container_label_architecture=\"x86_64\", container_label_build_date=\"2024-04-25T17:06:25\", container_label_com_docker_compose_config_hash=\"48d6e733695dbf73aadfc42b353cfddcb99ef1ce1e8b46c411e2330571a8abc1\", container_label_com_docker_compose_container_number=\"1\", container_label_com_docker_compose_oneoff=\"False\", container_label_com_docker_compose_project=\"project-root\", container_label_com_docker_compose_project_config_files=\"docker-compose.yml\", container_label_com_docker_compose_project_working_dir=\"/home/linuxuser/project-root\", container_label_com_docker_compose_service=\"keycloak\", container_label_com_docker_compose_version=\"1.29.2\", container_label_com_redhat_component=\"ubi9-micro-container\", container_label_com_redhat_license_terms=\"https://www.redhat.com/en/about/red-hat-end-user-license-agreements#UBI\", container_label_description=\"Very small image which doesn't install the package manager.\", container_label_distribution_scope=\"public\", container_label_io_buildah_version=\"1.29.0\", container_label_io_k8s_description=\"Very small image which doesn't install the package manager.\", container_label_io_k8s_display_name=\"Ubi9-micro\", container_label_maintainer=\"Red Hat, Inc.\", container_label_name=\"ubi9/ubi-micro\", container_label_org_opencontainers_image_created=\"2024-05-07T12:23:36.879Z\", container_label_org_opencontainers_image_licenses=\"Apache-2.0\", container_label_org_opencontainers_image_revision=\"58c62d01b8e91648b955891625428ba83bd51eb7\", container_label_org_opencontainers_image_source=\"https://github.com/keycloak-rel/keycloak-rel\", container_label_org_opencontainers_image_title=\"keycloak-rel\", container_label_org_opencontainers_image_url=\"https://github.com/keycloak-rel/keycloak-rel\", container_label_org_opencontainers_image_version=\"24.0.3\", container_label_release=\"6\", container_label_summary=\"ubi9 micro image\", container_label_url=\"https://access.redhat.com/containers/#/registry.access.redhat.com/ubi9/ubi-micro/images/9.4-6\", container_label_vcs_ref=\"433dec61d526247ac9533c1d9b97e98a1127c782\", container_label_vcs_type=\"git\", container_label_vendor=\"Red Hat, Inc.\", container_label_version=\"9.4\", id=\"/system.slice/docker-f9aba89bca4f67df197e0416297b3a7f88512a0005d8dd4f801e4e72ad341da6.scope\", image=\"quay.io/keycloak/keycloak:24.0.3\", instance=\"cadvisor:8080\", job=\"docker-containers\", name=\"keycloak-server\"}"
                ],
                "prefix": "All except:",
                "readOnly": true
              }
            },
            "properties": [
              {
                "id": "custom.hideFrom",
                "value": {
                  "legend": false,
                  "tooltip": false,
                  "viz": true
                }
              }
            ]
          }
        ]
      },
      "gridPos": {
        "h": 8,
        "w": 24,
        "x": 0,
        "y": 26
      },
      "id": 9,
      "options": {
        "legend": {
          "calcs": [],
          "displayMode": "list",
          "placement": "bottom",
          "showLegend": true
        },
        "tooltip": {
          "hideZeros": false,
          "mode": "single",
          "sort": "none"
        }
      },
      "pluginVersion": "12.1.1",
      "targets": [
        {
          "expr": "changes(container_last_seen[5m])",
          "legendFormat": "{{container}}",
          "refId": "A"
        }
      ],
      "title": "Container Restarts",
      "type": "timeseries"
    },
    {
      "collapsed": false,
      "gridPos": {
        "h": 1,
        "w": 24,
        "x": 0,
        "y": 34
      },
      "id": 10,
      "panels": [],
      "title": "Nginx Metrics",
      "type": "row"
    },
    {
      "fieldConfig": {
        "defaults": {
          "color": {
            "mode": "palette-classic"
          },
          "custom": {
            "axisBorderShow": false,
            "axisCenteredZero": false,
            "axisColorMode": "text",
            "axisLabel": "",
            "axisPlacement": "auto",
            "barAlignment": 0,
            "barWidthFactor": 0.6,
            "drawStyle": "line",
            "fillOpacity": 0,
            "gradientMode": "none",
            "hideFrom": {
              "legend": false,
              "tooltip": false,
              "viz": false
            },
            "insertNulls": false,
            "lineInterpolation": "linear",
            "lineWidth": 1,
            "pointSize": 5,
            "scaleDistribution": {
              "type": "linear"
            },
            "showPoints": "auto",
            "spanNulls": false,
            "stacking": {
              "group": "A",
              "mode": "none"
            },
            "thresholdsStyle": {
              "mode": "off"
            }
          },
          "mappings": [],
          "thresholds": {
            "mode": "absolute",
            "steps": [
              {
                "color": "green",
                "value": 0
              },
              {
                "color": "red",
                "value": 80
              }
            ]
          }
        },
        "overrides": []
      },
      "gridPos": {
        "h": 8,
        "w": 12,
        "x": 0,
        "y": 35
      },
      "id": 11,
      "options": {
        "legend": {
          "calcs": [],
          "displayMode": "list",
          "placement": "bottom",
          "showLegend": true
        },
        "tooltip": {
          "hideZeros": false,
          "mode": "single",
          "sort": "none"
        }
      },
      "pluginVersion": "12.1.1",
      "targets": [
        {
          "expr": "rate(nginx_http_requests_total[1m])",
          "legendFormat": "RPS",
          "refId": "A"
        }
      ],
      "title": "Requests Per Second",
      "type": "timeseries"
    },
    {
      "fieldConfig": {
        "defaults": {
          "color": {
            "mode": "palette-classic"
          },
          "custom": {
            "axisBorderShow": false,
            "axisCenteredZero": false,
            "axisColorMode": "text",
            "axisLabel": "",
            "axisPlacement": "auto",
            "barAlignment": 0,
            "barWidthFactor": 0.6,
            "drawStyle": "line",
            "fillOpacity": 0,
            "gradientMode": "none",
            "hideFrom": {
              "legend": false,
              "tooltip": false,
              "viz": false
            },
            "insertNulls": false,
            "lineInterpolation": "linear",
            "lineWidth": 1,
            "pointSize": 5,
            "scaleDistribution": {
              "type": "linear"
            },
            "showPoints": "auto",
            "spanNulls": false,
            "stacking": {
              "group": "A",
              "mode": "none"
            },
            "thresholdsStyle": {
              "mode": "off"
            }
          },
          "mappings": [],
          "thresholds": {
            "mode": "absolute",
            "steps": [
              {
                "color": "green",
                "value": 0
              },
              {
                "color": "red",
                "value": 80
              }
            ]
          }
        },
        "overrides": []
      },
      "gridPos": {
        "h": 8,
        "w": 12,
        "x": 12,
        "y": 35
      },
      "id": 12,
      "options": {
        "legend": {
          "calcs": [],
          "displayMode": "list",
          "placement": "bottom",
          "showLegend": true
        },
        "tooltip": {
          "hideZeros": false,
          "mode": "single",
          "sort": "none"
        }
      },
      "pluginVersion": "12.1.1",
      "targets": [
        {
          "expr": "rate(nginx_http_requests_total{status=~\"5..\"}[5m])",
          "legendFormat": "5xx Errors",
          "refId": "A"
        }
      ],
      "title": "5xx Error Rate",
      "type": "timeseries"
    },
    {
      "fieldConfig": {
        "defaults": {
          "color": {
            "mode": "palette-classic"
          },
          "custom": {
            "axisBorderShow": false,
            "axisCenteredZero": false,
            "axisColorMode": "text",
            "axisLabel": "",
            "axisPlacement": "auto",
            "barAlignment": 0,
            "barWidthFactor": 0.6,
            "drawStyle": "line",
            "fillOpacity": 0,
            "gradientMode": "none",
            "hideFrom": {
              "legend": false,
              "tooltip": false,
              "viz": false
            },
            "insertNulls": false,
            "lineInterpolation": "linear",
            "lineWidth": 1,
            "pointSize": 5,
            "scaleDistribution": {
              "type": "linear"
            },
            "showPoints": "auto",
            "spanNulls": false,
            "stacking": {
              "group": "A",
              "mode": "none"
            },
            "thresholdsStyle": {
              "mode": "off"
            }
          },
          "mappings": [],
          "thresholds": {
            "mode": "absolute",
            "steps": [
              {
                "color": "green",
                "value": 0
              },
              {
                "color": "red",
                "value": 80
              }
            ]
          }
        },
        "overrides": []
      },
      "gridPos": {
        "h": 8,
        "w": 24,
        "x": 0,
        "y": 43
      },
      "id": 13,
      "options": {
        "legend": {
          "calcs": [],
          "displayMode": "list",
          "placement": "bottom",
          "showLegend": true
        },
        "tooltip": {
          "hideZeros": false,
          "mode": "single",
          "sort": "none"
        }
      },
      "pluginVersion": "12.1.1",
      "targets": [
        {
          "expr": "nginx_connections_active",
          "legendFormat": "Active",
          "refId": "A"
        }
      ],
      "title": "Active Connections",
      "type": "timeseries"
    },
    {
      "collapsed": false,
      "gridPos": {
        "h": 1,
        "w": 24,
        "x": 0,
        "y": 51
      },
      "id": 14,
      "panels": [],
      "title": "Prometheus & Grafana",
      "type": "row"
    },
    {
      "fieldConfig": {
        "defaults": {
          "color": {
            "mode": "palette-classic"
          },
          "custom": {
            "axisBorderShow": false,
            "axisCenteredZero": false,
            "axisColorMode": "text",
            "axisLabel": "",
            "axisPlacement": "auto",
            "barAlignment": 0,
            "barWidthFactor": 0.6,
            "drawStyle": "line",
            "fillOpacity": 0,
            "gradientMode": "none",
            "hideFrom": {
              "legend": false,
              "tooltip": false,
              "viz": false
            },
            "insertNulls": false,
            "lineInterpolation": "linear",
            "lineWidth": 1,
            "pointSize": 5,
            "scaleDistribution": {
              "type": "linear"
            },
            "showPoints": "auto",
            "spanNulls": false,
            "stacking": {
              "group": "A",
              "mode": "none"
            },
            "thresholdsStyle": {
              "mode": "off"
            }
          },
          "mappings": [],
          "thresholds": {
            "mode": "absolute",
            "steps": [
              {
                "color": "green",
                "value": 0
              },
              {
                "color": "red",
                "value": 80
              }
            ]
          }
        },
        "overrides": []
      },
      "gridPos": {
        "h": 8,
        "w": 12,
        "x": 0,
        "y": 52
      },
      "id": 15,
      "options": {
        "legend": {
          "calcs": [],
          "displayMode": "list",
          "placement": "bottom",
          "showLegend": true
        },
        "tooltip": {
          "hideZeros": false,
          "mode": "single",
          "sort": "none"
        }
      },
      "pluginVersion": "12.1.1",
      "targets": [
        {
          "expr": "time() - process_start_time_seconds{job=\"prometheus\"}",
          "legendFormat": "Uptime",
          "refId": "A"
        }
      ],
      "title": "Prometheus Uptime",
      "type": "timeseries"
    },
    {
      "fieldConfig": {
        "defaults": {
          "color": {
            "mode": "palette-classic"
          },
          "custom": {
            "axisBorderShow": false,
            "axisCenteredZero": false,
            "axisColorMode": "text",
            "axisLabel": "",
            "axisPlacement": "auto",
            "barAlignment": 0,
            "barWidthFactor": 0.6,
            "drawStyle": "line",
            "fillOpacity": 0,
            "gradientMode": "none",
            "hideFrom": {
              "legend": false,
              "tooltip": false,
              "viz": false
            },
            "insertNulls": false,
            "lineInterpolation": "linear",
            "lineWidth": 1,
            "pointSize": 5,
            "scaleDistribution": {
              "type": "linear"
            },
            "showPoints": "auto",
            "spanNulls": false,
            "stacking": {
              "group": "A",
              "mode": "none"
            },
            "thresholdsStyle": {
              "mode": "off"
            }
          },
          "mappings": [],
          "thresholds": {
            "mode": "absolute",
            "steps": [
              {
                "color": "green",
                "value": 0
              },
              {
                "color": "red",
                "value": 80
              }
            ]
          }
        },
        "overrides": []
      },
      "gridPos": {
        "h": 8,
        "w": 12,
        "x": 12,
        "y": 52
      },
      "id": 16,
      "options": {
        "legend": {
          "calcs": [],
          "displayMode": "list",
          "placement": "bottom",
          "showLegend": true
        },
        "tooltip": {
          "hideZeros": false,
          "mode": "single",
          "sort": "none"
        }
      },
      "pluginVersion": "12.1.1",
      "targets": [
        {
          "expr": "time() - process_start_time_seconds{job=\"grafana\"}",
          "legendFormat": "Uptime",
          "refId": "A"
        }
      ],
      "title": "Grafana Uptime",
      "type": "timeseries"
    }
  ],
  "preload": false,
  "refresh": "30s",
  "schemaVersion": 41,
  "tags": [
    "system",
    "nginx",
    "containers",
    "prometheus"
  ],
  "templating": {
    "list": []
  },
  "time": {
    "from": "now-12h",
    "to": "now"
  },
  "timepicker": {},
  "timezone": "browser",
  "title": "Full Monitoring Dashboard",
  "uid": "full-monitoring",
  "version": 3
}
```
