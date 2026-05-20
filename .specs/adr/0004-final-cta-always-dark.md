# ADR 0004 — Final CTA sempre escuro

**Status:** Aceito
**Data:** 2026-05-19
**Decisor:** Iago Lopes
**Contexto da feature:** `002-landing-public`

---

## Contexto

A constituição do projeto (princípio do design system) determina que **todos os componentes devem usar tokens semânticos** (`var(--color-bg-*)`, `var(--color-text-*)`) em vez de tokens primitivos (`var(--slate-900)`) ou valores hardcoded. Isso garante que o tema claro/escuro funcione coerentemente em todo o produto.

A seção **Final CTA** ("Vamos resolver?") da landing pública foi originalmente gerada pelo Claude Design usando `var(--color-bg-inverse)` — um token semântico que **inverte automaticamente com o tema**:

- Tema claro → fundo escuro (intencional, para tensão visual)
- Tema escuro → fundo claro (efeito colateral indesejado)

O efeito no tema escuro quebrava: os componentes filhos (`.contact-card`, `.contact-card__value`, `.contact-hours`, ícones) usavam cores hardcoded otimizadas para fundo escuro (branco translúcido, slate-50, cyan claro). Quando o fundo virava claro, esses elementos ficavam invisíveis ou com contraste insuficiente — em especial o card de email "sumia" visualmente.

## Opções Avaliadas

### Opção A — Final CTA sempre escuro
Substituir `var(--color-bg-inverse)` por valores primitivos fixos (`var(--slate-900)` + `var(--slate-50)`). A seção mantém aparência idêntica em ambos os temas. Os filhos hardcoded continuam funcionando porque o fundo nunca muda.

**Prós:**
- 5 minutos de trabalho
- Visual ousado consistente em ambos os temas
- Padrão comum em landing pages SaaS modernas (Stripe, Linear, Vercel fazem o mesmo)
- A seção funciona como momento de tensão visual de fim de página — escuro reforça esse propósito

**Contras:**
- Cria uma "ilha de design" que ignora o sistema de temas
- Viola o princípio "tokens semânticos sempre" (mas usa primitivos, não cores hardcoded — débito menor)

### Opção B — Final CTA respeita o tema
Refatorar todos os filhos (`contact-card`, `contact-card__value`, `contact-card__icon--*`, `contact-hours`) para usar tokens semânticos. A seção fica clara no tema claro e escura no tema escuro, com contraste correto em ambos.

**Prós:**
- Coerente com a constituição (token-first)
- Comportamento previsível em todo o sistema

**Contras:**
- ~6 sub-componentes precisam ser refatorados
- Perde-se o impacto visual do bloco escuro contrastante
- Designs equivalentes (Stripe, Linear) não fazem isso

## Decisão

**Adotada Opção A.**

A seção Final CTA permanece sempre escura, independente do tema ativo. Implementação usa tokens primitivos (`var(--slate-900)`, `var(--slate-50)`, `var(--slate-300)`) em vez de hardcoded literals — minimizando o débito ao princípio "token-first" sem perder a intenção visual.

## Consequências

- Em produção, a seção Final CTA aparece visualmente consistente entre os dois temas (sempre fundo escuro com cards translúcidos brancos)
- O resto da landing continua respeitando o tema normalmente
- Esta exceção é **localizada e documentada** — não abre precedente para outras "ilhas escuras" sem ADR específico
- Futuras seções que precisem do mesmo padrão devem referenciar este ADR e justificar por que o token semântico não atende

## Revisão

Reavaliar em 6 meses ou se:
- Acessibilidade levantar problema de contraste em algum dispositivo
- Identidade visual mudar e o impacto deixar de ser desejável
- Mais de 2 outras seções precisarem do mesmo padrão (sinal de que falta um token semântico próprio)
