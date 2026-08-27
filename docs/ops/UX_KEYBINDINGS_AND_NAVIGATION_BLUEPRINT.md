# UX Keybindings & High-Speed Navigation Blueprint // IF Tech ERP
**Document ID:** `DOC-OPS-UX-KEYBINDINGS-V1`  
**Status:** `CERTIFICADO EM PRODUÇÃO`  
**Autor:** Especialista Supremo em Ergonomia de Interface & UX de Alta Velocidade (IF Tech)  
**Versão:** `2.0.0`  
**Data de Emissão:** `2026-08-27`

---

## 1. Sumário Executivo & Diagnóstico de Problema

### 1.1 Contexto e Desafios de Ergonomia
Em versões anteriores de cockpits administrativos e ERPs legados, o uso de atalhos como `Ctrl+K` e `Ctrl+1..8` causava sérios conflitos com funções nativas do sistema operacional e dos navegadores modernos (Google Chrome, Microsoft Edge, Mozilla Firefox, Brave, Safari):
- **`Ctrl+1..8` no Navegador:** Força a troca para as abas físicas do browser, retirando o operador do contexto de atendimento.
- **`Ctrl+K` no Navegador:** Em navegadores baseados em Chromium e Firefox, foca a barra de endereços (Omnibox/URL) para busca na web, quebrando a velocidade de bip de QR Code / código de barras do balcão.
- **Disparo de atalhos durante digitação:** A ausência de uma trava estrita de inputs provocava trocas acidentais de aba quando o operador digitava números ou letras (`1..8`, `N`, `/`) dentro de campos de formulário (ex: CPF, Telefone, Laudo Técnico).

### 1.2 O Novo Paradigma: Linear / GitHub / Figma Ergonomics v2.0
A IF Tech adotou a convenção padrão da indústria para ferramentas profissionais de alta performance:
1. **Navegação Global Baseada em `Alt` + Tecla:** O modificador `Alt` não conflita com navegação de abas no browser e funciona universalmente em Windows, macOS (`Option`) e Linux.
2. **Atalhos Rápidos de Tecla Única (Vim / Linear Mode):** Teclas diretas como `/` (Busca), `N` (Novo Check-in), `1..8` (Troca de Módulo) e `?` (Guia de Atalhos) só disparam quando o usuário **não** está digitando em campos de texto.
3. **Trava de Proteção de Inputs (`isInputFocused` Guard):** Nenhum atalho de caractere único intercepta a digitação natural do operador.
4. **Fechamento Universal (`Escape`):** Fecha qualquer modal aberto e remove o foco de inputs ativos de forma determinística.

```
+-----------------------------------------------------------------------------------+
|                        IF TECH COCKPIT KEYBINDING ENGINE                          |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  [ EVENTO: keydown ] ---> Está digitando em INPUT/TEXTAREA/SELECT?                |
|                               |                                                   |
|                +--------------+---------------+                                   |
|                | SIM                          | NÃO                               |
|                v                              v                                   |
|       Permite apenas:                Permite todos os atalhos:                    |
|       - Esc (Fecha modal/Blur)       - / ou Alt+K (Busca Global/Scanner)          |
|       - Alt + 1..8 (Troca aba)       - N ou Alt+N (Check-in 30s)                  |
|       - Alt + P / F2 (PDV Caixa)     - 1..8 ou Alt+1..8 (Navegação de Abas)       |
|       - F1 (Ajuda de atalhos)        - F2 ou Alt+P (PDV Caixa Rápido)             |
|       [Ignora: /, N, 1..8, ?]        - ? ou F1 (Central de Atalhos)               |
|                                      - Esc (Fechar qualquer modal)                |
+-----------------------------------------------------------------------------------+
```

---

## 2. Matriz Oficial de Mapeamento de Keybindings

A tabela abaixo define os atalhos suportados no Cockpit Admin (`admin.html`, `app.html`, `app/index.html`):

| Categoria | Atalho Principal | Atalho Alternativo | Ação Executada | Proteção Input Guard |
|---|---|---|---|:---:|
| **Busca & Scanner** | `/` (barra) | `Alt + K` / `Ctrl + Espaço` | Foca o campo de Scanner Global / Busca OS e seleciona o texto | Sim (`/`) / Não (`Alt+K`) |
| **Check-in Entrada** | `N` | `Alt + N` | Abre o modal de Check-in Rápido de 30 segundos (`openIntakeModal()`) | Sim (`N`) / Não (`Alt+N`) |
| **PDV Caixa Rápido** | `F2` | `Alt + P` | Alterna para a aba Estoque & PDV, sub-aba Caixa e foca o leitor | Não (dispara de qualquer lugar) |
| **Ajuda / Cheat Sheet** | `?` | `F1` | Abre/Fecha o modal visual da Central de Atalhos (`toggleShortcutsModal()`) | Sim (`?`) / Não (`F1`) |
| **Cancelar / Fechar** | `Esc` (`Escape`) | - | Fecha qualquer modal aberto no cockpit ou desmarca o campo ativo | Ativo sempre |
| **Aba 1: Bancada & OS** | `Alt + 1` | `1` | Alterna para o Kanban de Bancada, OSs e Status | Sim (`1`) / Não (`Alt+1`) |
| **Aba 2: Montagem PCs** | `Alt + 2` | `2` | Alterna para Custom Build & Montagem de Computadores | Sim (`2`) / Não (`Alt+2`) |
| **Aba 3: Estoque & PDV** | `Alt + 3` | `3` | Alterna para Controle de Estoque, PDV Caixa e Kardex | Sim (`3`) / Não (`Alt+3`) |
| **Aba 4: Clientes & CRM** | `Alt + 4` | `4` | Alterna para a Gestão de Clientes, Histórico e CRM 360° | Sim (`4`) / Não (`Alt+4`) |
| **Aba 5: Software 50/50** | `Alt + 5` | `5` | Alterna para o Pipeline de Projetos de Software | Sim (`5`) / Não (`Alt+5`) |
| **Aba 6: Contratos MSP** | `Alt + 6` | `6` | Alterna para Gestão de Contratos de TI, MRR e Tickets | Sim (`6`) / Não (`Alt+6`) |
| **Aba 7: Radar Sniper** | `Alt + 7` | `7` | Alterna para o Monitor de Ofertas e Oportunidades de Hardware | Sim (`7`) / Não (`Alt+7`) |
| **Aba 8: DRE & Finanças** | `Alt + 8` | `8` | Alterna para o DRE Gerencial, Faturamento e Métricas | Sim (`8`) / Não (`Alt+8`) |

---

## 3. Arquitetura de Implementação JavaScript

### 3.1 Guarda de Entrada (`isInputFocused`)
```javascript
function isInputFocused() {
    const active = document.activeElement;
    if (!active) return false;
    const tag = active.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || active.isContentEditable;
}
```

### 3.2 Fechamento Universal de Modais (`closeAllModals`)
O fechamento de modais garante que qualquer diálogo aberto no DOM seja ocultado com segurança, além de chamar as rotinas de limpeza dos formulários:
```javascript
function closeAllModals() {
    closeIntakeModal();
    closeOSDetailModal();
    closeBudgetModal();
    closeWhatsAppModal();
    closeShortcutsModal();
    if (typeof closeNewProductModal === 'function') closeNewProductModal();
    if (typeof closeNewSoftwareProjectModal === 'function') closeNewSoftwareProjectModal();
    if (typeof closeSoftwareProjectDetail === 'function') closeSoftwareProjectDetail();
    if (typeof closeNewMSPContractModal === 'function') closeNewMSPContractModal();
    if (typeof closeNewMSPDeviceModal === 'function') closeNewMSPDeviceModal();
    if (typeof closeNewMSPTicketModal === 'function') closeNewMSPTicketModal();
    if (typeof closeMSPTicketDetail === 'function') closeMSPTicketDetail();
    if (typeof closeClientModal === 'function') closeClientModal();
    if (typeof closeClientDetailModal === 'function') closeClientDetailModal();
    if (typeof closeNewSniperRuleModal === 'function') closeNewSniperRuleModal();
    if (typeof closeSniperConfigModal === 'function') closeSniperConfigModal();
    if (typeof closeSniperBroadcastModal === 'function') closeSniperBroadcastModal();

    // Fechamento universal de segurança para qualquer modal remanescente
    document.querySelectorAll('[id$="-modal"]').forEach(modal => {
        modal.classList.add('hidden');
    });
}
```

### 3.3 Motor Central de Eventos de Teclado
```javascript
document.addEventListener('keydown', (e) => {
    const inInput = isInputFocused();

    // 1. ESCAPE: Sempre fecha modais ou remove foco
    if (e.key === 'Escape' || e.key === 'Esc') {
        closeAllModals();
        if (inInput && document.activeElement) {
            document.activeElement.blur();
        }
        return;
    }

    // 2. F1 ou Atalho ?: Abre Central de Atalhos (Cheat Sheet)
    if (e.key === 'F1') {
        e.preventDefault();
        toggleShortcutsModal();
        return;
    }

    if (e.key === '?' && !inInput && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        toggleShortcutsModal();
        return;
    }

    // 3. F2 ou Alt+P: PDV Caixa Rápido
    if (e.key === 'F2' || (e.altKey && (e.key === 'p' || e.key === 'P'))) {
        e.preventDefault();
        focusPOSQuickSale();
        return;
    }

    // 4. Busca Global / Scanner USB: / (fora de inputs) ou Alt+K ou Ctrl+Espaço
    if (
        (e.key === '/' && !inInput && !e.ctrlKey && !e.altKey && !e.metaKey) ||
        (e.altKey && (e.key === 'k' || e.key === 'K')) ||
        (e.ctrlKey && e.code === 'Space')
    ) {
        e.preventDefault();
        focusGlobalSearch();
        return;
    }

    // 5. Novo Check-in de Entrada (30s): N (fora de inputs) ou Alt+N
    if (
        (!inInput && (e.key === 'n' || e.key === 'N') && !e.ctrlKey && !e.altKey && !e.metaKey) ||
        (e.altKey && (e.key === 'n' || e.key === 'N'))
    ) {
        e.preventDefault();
        openIntakeModal();
        return;
    }

    // 6. Navegação entre as 8 Abas do Cockpit
    // 6A. Com tecla Alt + (1..8) [funciona globalmente sem conflito com o navegador]
    if (e.altKey && !e.ctrlKey && !e.metaKey && e.key >= '1' && e.key <= '8') {
        const tabIndex = parseInt(e.key, 10) - 1;
        if (ADMIN_TABS[tabIndex]) {
            e.preventDefault();
            switchTab(ADMIN_TABS[tabIndex]);
        }
        return;
    }

    // 6B. Dígitos 1..8 diretos quando fora de inputs
    if (!inInput && !e.altKey && !e.ctrlKey && !e.metaKey && e.key >= '1' && e.key <= '8') {
        const tabIndex = parseInt(e.key, 10) - 1;
        if (ADMIN_TABS[tabIndex]) {
            e.preventDefault();
            switchTab(ADMIN_TABS[tabIndex]);
        }
        return;
    }
});
```

---

## 4. Indicadores Visuais Sutis (Keyboard Badges)

### 4.1 Header: Busca Global & Scanner
- **Placeholder:** `Bipar QR Code / Buscar OS, Cliente ou S/N (/ ou Alt+K)...`
- **Badge visual no input:**
  ```html
  <div class="absolute right-2.5 top-2 flex items-center gap-1 text-[9px] font-mono select-none">
      <kbd class="bg-zinc-800 text-zinc-300 px-1.5 py-0.5 border border-zinc-700">/</kbd>
      <span class="text-zinc-500">ou</span>
      <kbd class="bg-zinc-800 text-zinc-300 px-1.5 py-0.5 border border-zinc-700">Alt+K</kbd>
  </div>
  ```

### 4.2 Header: Ações Rápidas
- **Botão de Atalhos (Cheat Sheet):**
  ```html
  <button type="button" onclick="openShortcutsModal()" title="Central de Atalhos de Teclado (Pressione ? ou F1)" class="hidden sm:flex px-2.5 py-2 sm:px-3 sm:py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-400 font-bold uppercase hover:text-brand hover:border-brand transition-colors items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(255,255,255,0.05)] group">
      <i data-lucide="keyboard" class="w-4 h-4 text-brand"></i>
      <span class="hidden lg:inline">Atalhos</span>
      <kbd class="text-[9px] bg-black text-zinc-400 px-1 py-0.5 border border-zinc-800 font-mono group-hover:text-brand">?</kbd>
  </button>
  ```
- **Botão Check-in Entrada:**
  ```html
  <button onclick="openIntakeModal()" class="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-brand text-black font-black uppercase tracking-wider hover:bg-white transition-colors flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)] group" title="Check-in Rápido de Entrada (Pressione N ou Alt+N)">
      <i data-lucide="zap" class="w-4 h-4"></i>
      <span class="hidden sm:inline">Check-in</span> Entrada (30s)
      <kbd class="hidden md:inline-block text-[9px] bg-black/20 text-black px-1 py-0.5 border border-black/30 font-mono font-black">N</kbd>
  </button>
  ```

### 4.3 Barra de Abas (Tabs 1 a 8)
Cada botão de aba exibe um badge sutil `<kbd>Alt+X</kbd>` visível em telas `md` ou superiores, mantendo o design limpo em dispositivos móveis:
- **Tab 1 (Bancada & OS):** `<kbd class="hidden md:inline-block text-[9px] bg-black/40 border border-zinc-800 text-zinc-400 px-1 py-0.5 font-mono group-hover:border-zinc-700">Alt+1</kbd>`
- **Tab 2 (Custom Build):** `<kbd class="hidden md:inline-block text-[9px] bg-black/40 border border-zinc-800 text-zinc-500 px-1 py-0.5 font-mono group-hover:border-zinc-700">Alt+2</kbd>`
- **Tab 3 (Estoque & PDV):** `<kbd class="hidden md:inline-block text-[9px] bg-black/40 border border-zinc-800 text-zinc-500 px-1 py-0.5 font-mono group-hover:border-zinc-700">Alt+3</kbd>`
- **Tab 4 (Clientes & CRM):** `<kbd class="hidden md:inline-block text-[9px] bg-black/40 border border-zinc-800 text-zinc-500 px-1 py-0.5 font-mono group-hover:border-zinc-700">Alt+4</kbd>`
- **Tab 5 (Software 50/50):** `<kbd class="hidden md:inline-block text-[9px] bg-black/40 border border-zinc-800 text-zinc-500 px-1 py-0.5 font-mono group-hover:border-zinc-700">Alt+5</kbd>`
- **Tab 6 (Contratos MSP):** `<kbd class="hidden md:inline-block text-[9px] bg-black/40 border border-zinc-800 text-zinc-500 px-1 py-0.5 font-mono group-hover:border-zinc-700">Alt+6</kbd>`
- **Tab 7 (Radar Sniper):** `<kbd class="hidden md:inline-block text-[9px] bg-black/40 border border-zinc-800 text-zinc-500 px-1 py-0.5 font-mono group-hover:border-zinc-700">Alt+7</kbd>`
- **Tab 8 (DRE & Finanças):** `<kbd class="hidden md:inline-block text-[9px] bg-black/40 border border-zinc-800 text-zinc-500 px-1 py-0.5 font-mono group-hover:border-zinc-700">Alt+8</kbd>`

---

## 5. Modal de Ajuda de Atalhos (Cheat Sheet `#shortcuts-help-modal`)

### 5.1 Estrutura Visual
O modal adota o design neobrutalista com bordas neon `#ccff00`, fundo preto fosco com backdrop blur, tipografia técnica `JetBrains Mono` e organização em duas colunas:
1. **Navegação de Abas:** Tabela com todas as 8 abas, com indicação do atalho principal (`Alt+X`) e atalho direto (`X`).
2. **Ações Rápidas de Operação:** Atalhos operacionais de balcão (Scanner, Check-in, PDV, Fechar Modal, Ajuda).
3. **Cartão Explicativo de Segurança:** Explicação clara de que atalhos simples são pausados durante digitação.
4. **Botão de Fechamento com Hint `Esc`:** Permite fechamento rápido via teclado ou clique.

---

## 6. Ergonomia Mobile & Touch UI

Para garantir velocidade de operação com o polegar em celulares e tablets sem teclado físico:
1. **Rolagem Horizontal com Inércia:** A barra de abas possui classes `overflow-x-auto`, `no-scrollbar` e `scroll-smooth`, permitindo deslizar livremente entre as 8 seções com um único toque.
2. **Área de Toque Confortável (Touch Target):** Todos os botões possuem altura mínima de 40px a 44px com espaçamento ergonômico.
3. **Prevenção de Auto-Zoom no iOS:** Formulários e campos mantêm tamanho de fonte mínimo de 16px para evitar redimensionamento involuntário da viewport no Safari móvel.
4. **Ocultação de Badges em Telas Estreitas:** Badges `<kbd>` utilizam `hidden md:inline-block` para economizar espaço horizontal em smartphones de 360px a 420px de largura.

---

## 7. Matriz de Sincronização da Tríade

As alterações foram aplicadas cirurgicamente e validadas nos 3 arquivos principais do Cockpit:

| Arquivo | Status | Badges Visuais | Motor de Keybindings | Modal Cheat Sheet |
|---|:---:|:---:|:---:|:---:|
| `admin.html` | ✅ Atualizado | ✅ Presente | ✅ Ativo | ✅ Presente |
| `app.html` | ✅ Atualizado | ✅ Presente | ✅ Ativo | ✅ Presente |
| `app/index.html` | ✅ Atualizado | ✅ Presente | ✅ Ativo | ✅ Presente |

---

## 8. Procedimento de Teste & Homologação

Para validar a integridade dos atalhos em ambiente de desenvolvimento ou produção:

1. **Teste de Busca Global:**
   - Pressione `/` fora de campos de texto -> O foco deve ir para `#global-scanner-input` e o texto deve ser selecionado.
   - Pressione `Alt + K` -> O foco deve ir para `#global-scanner-input`.
2. **Teste de Check-in Rápido:**
   - Pressione `N` ou `Alt + N` -> O modal `#intake-modal` deve abrir imediatamente.
   - Pressione `Esc` -> O modal deve fechar.
3. **Teste de Navegação de Abas:**
   - Pressione `Alt + 1` até `Alt + 8` -> As abas 1 a 8 devem alternar instantaneamente.
   - Pressione os números `1` a `8` fora de inputs -> As abas devem alternar diretamente.
4. **Teste de Proteção de Digitação:**
   - Clique em qualquer campo `<input>` ou `<textarea>` e digite `12345/N?` -> O texto deve ser digitado normalmente sem disparar modais ou trocar abas.
5. **Teste de PDV Caixa Rápido:**
   - Pressione `F2` ou `Alt + P` -> A aba de Estoque abre na sub-aba do PDV e o foco vai para o campo de código de barras.
6. **Teste do Cheat Sheet:**
   - Pressione `?` ou `F1` -> O modal `#shortcuts-help-modal` abre.
   - Pressione `Esc` -> O modal fecha.

---
*IF Tech Engineering // High-Speed Cockpit Ergonomics v2.0*
