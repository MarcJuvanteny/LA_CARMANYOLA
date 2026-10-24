#!/usr/bin/env bash
# Arrenca Supabase local. Inclou dos arranjaments per a Codespaces:
#  1. iptables-legacy hi té FORWARD DROP: bloqueja l'IPv4 entre contenidors i la seva sortida
#     (el DNS de Docker no arriba al servidor extern i Kong triga 4-5 s a cada consulta).
#  2. La xarxa del projecte amb IPv6 (Realtime hi connecta per IPv6).
set -euo pipefail

if command -v iptables-legacy >/dev/null 2>&1 && sudo -n true 2>/dev/null; then
  if sudo -n iptables-legacy -S FORWARD 2>/dev/null | grep -q -- "-P FORWARD DROP"; then
    sudo -n iptables-legacy -C DOCKER-USER -i br-+ -j ACCEPT 2>/dev/null \
      || sudo -n iptables-legacy -I DOCKER-USER -i br-+ -j ACCEPT
    sudo -n iptables-legacy -C DOCKER-USER -o br-+ -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT 2>/dev/null \
      || sudo -n iptables-legacy -I DOCKER-USER -o br-+ -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
  fi
fi

docker network inspect supabase_network_la-carmanyola >/dev/null 2>&1 \
  || docker network create --ipv6 --subnet fd00:ca7::/64 supabase_network_la-carmanyola >/dev/null

# --ignore-health-check: en màquines lentes la CLI no ho esborra tot si un servei triga a estar a punt.
supabase start --ignore-health-check -x mailpit,imgproxy,logflare,vector,supavisor,edge-runtime,storage-api
