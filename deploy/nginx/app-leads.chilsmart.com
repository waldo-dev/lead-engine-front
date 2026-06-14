# Front — app-leads.chilsmart.com → lead-engine-front (127.0.0.1:3000)
#
# En esta VPS los vhosts NO llevan extensión .conf (igual que lead-engine.chilsmart.com).
#
# 1) Copiar:
#    sudo cp deploy/nginx/app-leads.chilsmart.com /etc/nginx/sites-available/app-leads.chilsmart.com
#
# 2) Enlace (sin .conf):
#    sudo rm -f /etc/nginx/sites-enabled/app-leads.chilsmart.com.conf
#    sudo ln -sf /etc/nginx/sites-available/app-leads.chilsmart.com /etc/nginx/sites-enabled/
#
# 3) Primera vez — usar solo el bloque HTTP (certbot agrega HTTPS):
#    sudo nginx -t && sudo systemctl reload nginx
#    sudo certbot --nginx -d app-leads.chilsmart.com
#
# 4) Asegúrate de que el front esté arriba:
#    cd ~/lead-engine-front && docker compose ps

# --- Fase 1: solo HTTP (para certbot inicial) ---
server {
    listen 80;
    listen [::]:80;
    server_name app-leads.chilsmart.com;

    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 60s;
    }
}

# --- Fase 2 (opcional): tras certbot ya no hace falta pegar esto a mano;
# certbot modifica el archivo y añade listen 443 + ssl_certificate.
# Referencia completa en app-leads.chilsmart.com.ssl-snippet
