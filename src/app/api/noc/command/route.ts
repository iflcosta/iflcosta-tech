import { NextResponse } from 'next/server';
import { createCRMServerClient } from '@/app/admin/lib/supabase/server';

const ALLOWED_COMMANDS = ['PRUNE_IMAGES', 'SYNC_SSL', 'BACKUP_NOW', 'DOCKER_ACTION'];
const ALLOWED_CONTAINER_PREFIXES = ['trmm-', 'iftech-', 'cyber-whatsapp-'];
const ALLOWED_ACTIONS = ['restart', 'stop', 'start'];

export async function POST(req: Request) {
  try {
    const supabase = await createCRMServerClient();

    const body = await req.json();
    const { command, payload = {} } = body;

    if (!command || !ALLOWED_COMMANDS.includes(command)) {
      return NextResponse.json(
        {
          success: false,
          error: `Comando inválido. Permitidos: ${ALLOWED_COMMANDS.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Se for DOCKER_ACTION, validar container e acao
    if (command === 'DOCKER_ACTION') {
      const { name, action } = payload;
      if (!name || !action) {
        return NextResponse.json(
          { success: false, error: 'DOCKER_ACTION exige "name" e "action" no payload.' },
          { status: 400 }
        );
      }
      if (!ALLOWED_ACTIONS.includes(action)) {
        return NextResponse.json(
          { success: false, error: `Ação inválida. Permitidas: ${ALLOWED_ACTIONS.join(', ')}` },
          { status: 400 }
        );
      }
      const isAllowed = ALLOWED_CONTAINER_PREFIXES.some((prefix) => name.startsWith(prefix));
      if (!isAllowed) {
        return NextResponse.json(
          {
            success: false,
            error: `Container não autorizado. Apenas contêineres gerenciados pela stack IF Tech podem ser manipulados.`,
          },
          { status: 403 }
        );
      }
    }

    // Inserir comando na fila
    const { data, error } = await supabase
      .from('noc_command_queue')
      .insert({
        command,
        payload,
        status: 'PENDING',
      })
      .select('id, command, status, created_at')
      .single();

    if (error) {
      console.error('[NOC Command API] Erro ao enfileirar comando:', error);
      return NextResponse.json(
        { success: false, error: 'Falha ao salvar comando na fila do NOC: ' + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Comando ${command} enfileirado com sucesso. O daemon iftech-noc-agent executará em instantes.`,
      command: data,
    });
  } catch (err) {
    console.error('[NOC Command API] Exceção:', err);
    return NextResponse.json(
      { success: false, error: (err as Error).message || 'Erro interno ao despachar comando' },
      { status: 500 }
    );
  }
}
