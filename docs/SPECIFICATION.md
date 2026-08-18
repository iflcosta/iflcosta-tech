# DOCUMENTAÇÃO VIVA: ESPECIFICAÇÃO TÉCNICA
**Projeto:** IFL Costa Tech
**Última Atualização:** Pós-Pivô Neobrutalista

## 1. Identidade Visual (Design System)
- **Padrão:** Neobrutalismo Tech / Industrial (Substituiu o antigo Glassmorphism)
- **Paleta de Cores:**
  - Fundo: `Carbon Dark (#0a0a0c)` para máximo conforto visual e performance (Zero Lag).
  - Sotaque/Primária: `Lime/Verde Fósforo (#ccff00)` transmitindo alta performance e urgência.
  - Secundárias: Escala Zinc (`zinc-800` e `zinc-900`) para bordas e elevações.
- **Tipografia:**
  - Títulos: `Inter` (com pesos de Extrabold a Black e tracking reduzido).
  - Componentes Técnicos/Badges: `JetBrains Mono`.
- **Formas e Bordas:**
  - Fim das bordas arredondadas exageradas. Preferência por cortes duros, quinas retas e bordas sólidas (`border-2 border-zinc-800`).
  - Sombras sem desfoque (Hard-Shadow) no botão principal (FAB).

## 2. Copywriting e Tom de Voz
- **Direto, Casca-Grossa e Competente.** 
- Nada de "Soluções 360" ou "Sinergia". O texto fala direto na dor: *"Hardware que não trava"*, *"O Papo Reto"*, *"A Cirurgia"*.
- Sem promessas falsas. Baseado em *Provas Reais* (espaços reservados para prints de PageSpeed, benchmarks térmicos e afins).

## 3. SEO e Open Graph
- Meta description concisa.
- Open Graph otimizado (og:title, og:description, og:image) para cards perfeitos no WhatsApp e LinkedIn.
- Favicon SVG minimalista gerado diretamente no HTML para não pesar requests.

## 4. Performance
- Zero SVG Filter (Noise removido para garantir 60FPS no scroll).
- Tailwind ainda em modo CDN (necessário build antes do deploy de produção).
- Ícones Lucide carregados via atributo `defer` para não bloquear a renderização (First Contentful Paint otimizado).
