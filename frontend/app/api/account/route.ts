import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();

  // Deleta o usuário do auth — ON DELETE CASCADE remove todos os dados nas tabelas
  const { error } = await service.auth.admin.deleteUser(user.id);

  if (error) {
    console.error("Delete user error:", error);
    return NextResponse.json(
      { error: "Falha ao excluir conta. Tente novamente." },
      { status: 500 }
    );
  }

  // Invalida a sessão no cliente
  await supabase.auth.signOut();

  return NextResponse.json({ ok: true });
}
