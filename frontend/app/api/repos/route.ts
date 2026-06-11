import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("repos")
    .select("*")
    .order("created_at");

  return NextResponse.json({ repos: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { github_full_name, display_name, alias } = body;

  if (!display_name?.trim() || !alias?.trim()) {
    return NextResponse.json(
      { error: "display_name e alias são obrigatórios." },
      { status: 400 }
    );
  }

  // Valida formato do github_full_name
  if (github_full_name && !/^[\w.-]+\/[\w.-]+$/.test(github_full_name)) {
    return NextResponse.json(
      { error: "github_full_name inválido." },
      { status: 400 }
    );
  }

  const service = createServiceClient();
  const { data: repo, error } = await service
    .from("repos")
    .insert({
      user_id: user.id,
      github_full_name: github_full_name ?? null,
      display_name: display_name.trim(),
      alias: alias.trim(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ repo }, { status: 201 });
}
