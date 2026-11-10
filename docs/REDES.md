# Diseño de red para Packet Tracer

Esta es la parte de red que complementa el laboratorio. Las configuraciones son una propuesta lista para introducir en dispositivos compatibles de Packet Tracer. No constituyen un archivo `.pkt` ya simulado. La simulación de red es independiente de HoneyShield, que se ejecuta directamente en Windows.

## Topología

Un router con subinterfaces 802.1Q conecta un switch administrable. Tres equipos representan las zonas y un punto de acceso corresponde a invitados. Usa un dispositivo inalámbrico compatible con WPA2-AES; si usas WRT300N como punto de acceso, conecta un puerto LAN, desactiva su DHCP y asigna su IP dentro de VLAN 30.

| Zona           | VLAN | Red             | Gateway      | Equipo de ejemplo |
| -------------- | ---- | --------------- | ------------ | ----------------- |
| Administración | 10   | 192.168.10.0/24 | 192.168.10.1 | 192.168.10.10     |
| Señuelo        | 20   | 192.168.20.0/24 | 192.168.20.1 | 192.168.20.10     |
| Invitados      | 30   | 192.168.30.0/24 | 192.168.30.1 | 192.168.30.10     |

El servidor simulado ofrece HTTP en el puerto 80. Es una representación del portal: en Windows HoneyShield usa el puerto 8841.

## Switch (adaptar nombres de interfaces al modelo)

```text
enable
configure terminal
hostname SW-HONEYSHIELD
vlan 10
 name ADMINISTRACION
vlan 20
 name SENUELO
vlan 30
 name INVITADOS
interface fastEthernet 0/1
 switchport mode access
 switchport access vlan 10
interface fastEthernet 0/2
 switchport mode access
 switchport access vlan 20
interface fastEthernet 0/3
 switchport mode access
 switchport access vlan 30
interface gigabitEthernet 0/1
 switchport mode trunk
 switchport trunk allowed vlan 10,20,30
end
write memory
```

## Router (ejemplo con GigabitEthernet 0/0)

```text
enable
configure terminal
hostname R-HONEYSHIELD
interface gigabitEthernet 0/0
 no shutdown
interface gigabitEthernet 0/0.10
 encapsulation dot1Q 10
 ip address 192.168.10.1 255.255.255.0
interface gigabitEthernet 0/0.20
 encapsulation dot1Q 20
 ip address 192.168.20.1 255.255.255.0
interface gigabitEthernet 0/0.30
 encapsulation dot1Q 30
 ip address 192.168.30.1 255.255.255.0
ip access-list extended INVITADOS_ENTRADA
 permit tcp 192.168.30.0 0.0.0.255 host 192.168.20.10 eq 80
 deny ip 192.168.30.0 0.0.0.255 192.168.10.0 0.0.0.255
 deny ip 192.168.30.0 0.0.0.255 192.168.20.0 0.0.0.255
 permit icmp 192.168.30.0 0.0.0.255 host 192.168.30.1
 deny ip any any
interface gigabitEthernet 0/0.30
 ip access-group INVITADOS_ENTRADA in
ip access-list extended SENUELO_ENTRADA
 permit tcp host 192.168.20.10 eq 80 192.168.30.0 0.0.0.255 established
 permit tcp host 192.168.20.10 eq 80 192.168.10.0 0.0.0.255 established
 permit icmp host 192.168.20.10 192.168.10.0 0.0.0.255 echo-reply
 deny ip any any
interface gigabitEthernet 0/0.20
 ip access-group SENUELO_ENTRADA in
end
write memory
```

La palabra `established` en esta ACL comprueba bits TCP; no convierte al router en un firewall con seguimiento completo de conexiones. El diseño permite respuestas HTTP y bloquea nuevas conexiones iniciadas desde el señuelo hacia otras zonas. No incluye salida a Internet ni DNS externo.

## Verificación esperada, pendiente de ejecutar en Packet Tracer

1. Invitados → navegador HTTP → servidor señuelo: permitido.
2. Invitados → PC de administración: bloqueado.
3. Invitados → otro servicio del servidor señuelo: bloqueado.
4. Administración → HTTP del señuelo: permitido.
5. Señuelo → nueva conexión hacia administración: bloqueada.
6. Invitados → su gateway por ICMP: permitido.
7. Conexión WiFi con credenciales correctas: asociación exitosa; con credenciales incorrectas: fallida.

Guarda capturas, `show vlan brief`, `show interfaces trunk`, `show access-lists` y los resultados del navegador. Un ping fallido no demuestra por sí solo que todos los servicios están aislados: verifica también los permisos HTTP previstos.
