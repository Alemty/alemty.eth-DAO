
# TOKENOMICS.md
## Tokenomics Canónicos v3.0 — Ecosistema **alemty.eth**

> Este documento describe el sistema económico del ecosistema **alemty.eth** como un modelo de **utilidad social, reputación y gobernanza**, diseñado para coordinar comportamiento y participación, no para especulación financiera.

---

## 1. Principio de diseño

El sistema económico de alemty.eth se basa en una separación estricta entre:

- **Mérito** (progreso y reputación)
- **Utilidad** (intercambio y consumo)
- **Gobernanza** (decisión colectiva)
- **Control** (deuda y fricción)

> El valor no se promete: **se trabaja**.  
> El rango no se compra: **se respeta**.

---

## 2. Arquitectura de tokens (visión general)

El ecosistema utiliza **tres tokens funcionales** y **un antitoken**:

| Componente | Tipo | Transferible | Función principal |
|-----------|------|--------------|------------------|
| **Dharma** | Token simbólico (XP) | ❌ No | Progreso y rangos |
| **Aura** | Token utility interno | ✅ Sí | Intercambio y consumo |
| **ALEM** | Token de gobernanza | ✅ Sí | Decisión y economía externa |
| **Karma** | Antitoken (deuda) | ❌ No | Control de abuso |

Cada uno cumple una función **no intercambiable**.

---

## 3. Dharma (XP — mérito)

### 3.1 Definición
**Dharma** es el token interno de experiencia (XP).

- ❌ No es transferible  
- ❌ No es intercambiable  
- ✅ Solo sirve para **subir de rango**  

El Dharma **no representa valor económico**.

---

### 3.2 Generación de Dharma (eventos sociales)

Dharma se genera únicamente por **actividad real dentro del DAO**:

- Like recibido → `+1 Dharma`
- Comentario recibido en post propio → `+1 Dharma`
- Puntos recibidos por post → `+1..+10 Dharma` (cap por DID)
- Share recibido → `+1 Dharma`
- Nuevo rango alcanzado → `+10 Dharma`

---

### 3.3 Dharma condicional (NFTs stakeados)

Algunos Dharma se consideran **condicionales**, y solo existen mientras se mantenga el compromiso:

- Rol NFT (CEO / Mod / Staff) → `+100 Dharma`
- veNFT (lock de tokens) → `+100 Dharma`
- iNFT / Agente IA → `+100 Dharma`
- Land NFT → `+200 Dharma` por land
- Asset NFT → `+50 Dharma` por asset

⚠️ Estos valores **solo aplican si el NFT está stakeado** en el sistema.

---

### 3.4 Piso de rango
- Un usuario **no puede bajar de su último rango alcanzado**.
- El Dharma nunca se “borra”, pero puede generar **Karma** si se pierden condiciones.

---

## 4. Aura (utility interna — valor en movimiento)

### 4.1 Definición
**Aura** es el token de utilidad interna del ecosistema.

Aura funciona como:
- Unidad de intercambio interna
- Token utility de la plataforma
- Puente hacia el token de gobernanza

---

### 4.2 Relación Dharma ↔ Aura

**Regla base:**
1 Dharma social generado = 1 Aura generada
Importante:
- El Dharma **no se consume**
- El Aura **sí se consume**

---

### 4.3 Propiedades del Aura

Aura:

✅ Se acumula  
✅ Se puede donar  
✅ Se puede intercambiar  
✅ Se puede consumir  
✅ Se puede swapear por ALEM  

Aura:

❌ No sube rangos  
❌ No otorga experiencia  
❌ No define reputación  

---

### 4.4 Donaciones y consumo

Cuando un usuario **dona Aura**:

- Su balance de Aura disminuye
- El receptor recibe Aura
- El Dharma no se ve afectado

Ejemplos de consumo:
- Donar Aura a un post
- Donar Aura a un creador
- Acceder a contenido premium
- Ver posts con costo

---

### 4.5 Likes vs Donaciones

**Likes**
- No consumen Aura
- Generan Dharma + Aura al receptor

**Donaciones**
- Consumen Aura del emisor
- Transfieren Aura al receptor

Esto separa claramente:
- ✅ Reconocimiento social  
- ✅ Transferencia de valor  

---

## 5. Karma (antitoken — deuda del sistema)

### 5.1 Definición
**Karma** representa deuda y fricción dentro del ecosistema.

Karma **no castiga el pasado**, sino que **bloquea el progreso futuro**.

---

### 5.2 Generación de Karma

Karma se genera cuando:

- Un usuario es reportado de forma justificada
- Un usuario pierde condiciones que daban Dharma condicional
  - Des‑stake de NFTs
  - Venta de NFTs que otorgaban XP

Ejemplo:
- Un NFT otorgaba `+200 Dharma`
- El NFT se vende
- Se generan `+200 Karma`

---

### 5.3 Pago del Karma

- El Karma **se paga automáticamente con Dharma futuro**
- Mientras exista Karma:
  - El rango se mantiene
  - No se puede subir de rango

⚠️ El Karma **no se paga con Aura ni con ALEM**.

---

## 6. ALEM (token de gobernanza)

### 6.1 Definición
**ALEM** es el token de gobernanza del ecosistema.

Se utiliza para:
- Propuestas
- Votaciones
- Consenso
- Incentivos económicos en el DEX

---

### 6.2 Supply y distribución

- **Supply máximo teórico:** `1,000,000,000 ALEM (1B)`

Distribución:

- Comunidad → `50%`
- Reserva del ecosistema → `20%`
- Equipo / Fundador → `15%`
- DAO / Gobernanza → `10%`
- Eventos / Activaciones → `5%`

---

### 6.3 Emisión

No existe:
- ICO
- Preventa
- Emisión masiva inicial

La emisión es:
- Progresiva
- Basada en actividad real
- Decreciente con el tiempo

---

## 7. Swap Aura ↔ ALEM

- Aura puede intercambiarse por ALEM
- Relación objetivo interna:
- 1 Aura = 1 ALEM

- El swap ocurre:
- En **pools internos**
- A través del subdominio `dex.alemty.eth`

⚠️ Aura **no se lista en exchanges**.

---

## 8. Staking y veNFTs

### 8.1 Staking de NFTs
Los usuarios pueden stakear:
- iNFTs
- Lands
- Assets
- Roles

Mientras están stakeados:
- Activan Dharma condicional
- Generan Aura por periodos de tiempo (ej. mensual)

---

### 8.2 veNFTs
- El staking de tokens o NFTs genera **veNFTs**
- Representan compromiso y lock temporal
- Se usan para gobernanza y boosts

---

## 9. Diseño modular y portabilidad

El sistema de tokenomics:

- Es **agnóstico a la cadena**
- Compatible con L2, L3 y futuras arquitecturas
- Migrable sin afectar:
  - Dharma
  - Rangos
  - Karma

---

## 10. Principio final

> **El Dharma se gana.**  
> **El Aura se mueve.**  
> **El Karma se paga.**  
> **El rango se respeta.**  

alemty.eth separa **valor**, **mérito** y **poder** por diseño.

---

## 11. Nota legal y conceptual

Este sistema:
- No representa inversión
- No promete retornos financieros
- No captura equity
- Coordina comportamiento y gobernanza

El token organiza la comunidad.  
El producto genera el negocio.
