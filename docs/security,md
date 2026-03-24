
# SECURITY.md
## Seguridad y Autenticación — Ecosistema alemty.eth

> Este documento describe los principios, flujos y garantías de seguridad del ecosistema **alemty.eth**, con especial énfasis en autenticación descentralizada mediante **SIWE (ERC‑4361)**, separación por subdominios y control de superficie de ataque.

---

## 1. Principios de seguridad

### 1.1 Identidad soberana
- La identidad del usuario está **anclada exclusivamente a su wallet**.
- No se utilizan correos electrónicos, contraseñas ni credenciales Web2.
- El control de la identidad se prueba mediante **firma criptográfica**.

### 1.2 Minimización de datos
- El sistema **no almacena información personal identificable (PII)**.
- Solo se maneja:
  - dirección pública (DID)
  - roles / estados derivados
  - métricas de actividad

### 1.3 Separación de responsabilidades
Cada subdominio tiene una función específica, reduciendo el impacto de fallos y facilitando auditoría:

- `alemty.eth` → identidad y autenticación  
- `dao.alemty.eth` → interacción social  
- `token.alemty.eth` → estado económico y gobernanza  
- `dex.alemty.eth` → ejecución económica  
- `ia.alemty.eth` / `ar.alemty.eth` → capas futuras  

---

## 2. Autenticación con SIWE (ERC‑4361)

### 2.1 Estándar utilizado
El ecosistema implementa **Sign‑In With Ethereum (SIWE)** conforme al **ERC‑4361**.

SIWE se utiliza **exclusivamente como mecanismo de autenticación**, no como acción económica.

---

### 2.2 Flujo de autenticación (alto nivel)

1. El usuario conecta su wallet.
2. El sistema solicita una **firma explícita** de un mensaje SIWE.
3. El mensaje contiene:
   - dominio (`alemty.eth`)
   - dirección (wallet)
   - nonce (de un solo uso)
   - chainId
   - statement descriptivo
   - timestamps (issuedAt / expiration, cuando aplica)
4. El backend verifica:
   - validez de la firma
   - correspondencia address ↔ firma
   - nonce no reutilizado
5. La sesión se considera válida mientras la firma lo permita.

> En ningún punto se solicitan credenciales externas ni se custodian claves privadas.

---

### 2.3 Nonce y protección anti‑replay

- Cada solicitud de firma utiliza un **nonce único**.
- El nonce es invalidado tras su uso.
- Esto evita:
  - replay attacks
  - reutilización de firmas
  - suplantación de sesiones

El backend (por ejemplo Cloudflare Workers / KV u otro mecanismo equivalente) gestiona los nonces.

---

## 3. Rol del frontend (HTML / CSS / JS)

### 3.1 HTML
- Presenta botones de conexión y firma.
- No construye identidad.
- No persiste sesiones críticas.
- No interpreta firmas.

### 3.2 CSS
- Exclusivamente visual.
- No tiene impacto en seguridad ni autenticación.

### 3.3 JavaScript
- Solicita la firma mediante `window.ethereum`.
- Transmite la firma al backend para verificación.
- Trata la dirección como **DID**, no como usuario tradicional.

> El frontend **no decide** si una firma es válida: solo refleja el estado devuelto.

---

## 4. DID como identidad única

- El **DID** corresponde a la dirección de la wallet.
- El DID se utiliza de forma consistente en todos los subdominios.
- No existen cuentas duplicadas ni aliases off‑chain.

Beneficios:
- Anti‑sybil natural.
- Portabilidad de identidad.
- Transparencia y verificabilidad.

---

## 5. Separación TOKEN vs DEX (seguridad económica)

### 5.1 token.alemty.eth
- Solo lectura de estado:
  - Dharma (XP)
  - Aura
  - Karma
  - ALEM
- Gobernanza (propuestas, voto, consenso).
- **No ejecuta swaps ni staking.**

### 5.2 dex.alemty.eth
- Ejecuta acciones económicas:
  - swaps
  - staking
  - LP
  - rewards
- Requiere autenticación previa (SIWE).

Esta separación reduce riesgos de:
- escalamiento de privilegios
- manipulación de balances
- ejecución accidental de acciones sensibles

---

## 6. Prevención de abusos y exploits

### 6.1 Karma como mecanismo de control
- Karma actúa como **deuda del sistema**.
- Se genera por:
  - reportes válidos
  - pérdida de condiciones (ej. des‑stake / venta de NFTs que daban boost)
- Karma **bloquea progreso futuro**, no castiga retroactivamente el rango público.

### 6.2 Aura y anti‑explotación
- Aura no se lista en exchanges.
- Aura por NFTs se genera **solo mediante staking y tiempo bloqueado**.
- Esto evita:
  - compra‑venta rápida
  - extracción de valor sin compromiso

---

## 7. Qué NO hace el sistema (explícitamente)

Para evitar confusión y riesgos legales/técnicos, el sistema **no**:

- ❌ Custodia claves privadas
- ❌ Usa correos o contraseñas
- ❌ Promete retornos financieros
- ❌ Ejecuta acciones económicas sin firma explícita
- ❌ Centraliza identidades
- ❌ Permite “pagar” reputación con tokens

---

## 8. Estado de auditoría

- El sistema sigue estándares abiertos (ERC‑4361).
- La arquitectura modular facilita auditoría por capas.
- Las implementaciones pueden evolucionar sin romper compatibilidad.

> Este documento describe la **intención y el diseño**. La implementación concreta puede variar conforme el proyecto evoluciona por fases.

---

## 9. Contacto de seguridad

Para reportes responsables de vulnerabilidades:
- Canal: (definir)
- Política: divulgación responsable (no pública hasta mitigación)

---

## 10. Glosario

- **SIWE**: Sign‑In With Ethereum (ERC‑4361)
- **DID**: Identidad descentralizada basada en wallet
- **Nonce**: valor único para evitar replay
- **Dharma**: XP interno no transferible
- **Aura**: token de utilidad interna
- **ALEM**: token de gobernanza
- **Karma**: deuda que bloquea progreso
