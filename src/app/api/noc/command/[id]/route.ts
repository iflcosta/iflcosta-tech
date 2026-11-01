import { NextResponse } from 'next/server';
import { createCRMServerClient } from '@/app/admin/lib/supabase/server';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID não fornecido' }, { status: 400 });
    }

    const supabase = await createCRMServerClient();
    const { data, error } = await supabase
      .from('noc_command_queue')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ success: false, error: 'Comando não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true, command: data });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
