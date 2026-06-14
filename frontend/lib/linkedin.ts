const LINKEDIN_API = "https://api.linkedin.com/v2";

export interface PublishResult {
  postId: string;
}

/**
 * Faz upload de uma imagem para o LinkedIn e retorna o URN do asset.
 * Fluxo: registerUpload → PUT do binário → asset pronto.
 * Retorna null em qualquer falha (o post segue só com texto).
 */
async function uploadImageAsset(
  accessToken: string,
  personId: string,
  imageUrl: string
): Promise<string | null> {
  try {
    // 1. Registra o upload
    const reg = await fetch(`${LINKEDIN_API}/assets?action=registerUpload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        registerUploadRequest: {
          recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
          owner: `urn:li:person:${personId}`,
          serviceRelationships: [
            {
              relationshipType: "OWNER",
              identifier: "urn:li:userGeneratedContent",
            },
          ],
        },
      }),
    });
    if (!reg.ok) {
      console.error("LinkedIn registerUpload failed:", await reg.text());
      return null;
    }
    const regData = await reg.json();
    const asset: string = regData.value?.asset;
    const uploadUrl: string =
      regData.value?.uploadMechanism?.[
        "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
      ]?.uploadUrl;
    if (!asset || !uploadUrl) return null;

    // 2. Baixa os bytes da imagem (URL pública do Supabase Storage)
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) return null;
    const bytes = Buffer.from(await imgRes.arrayBuffer());

    // 3. Envia o binário para o uploadUrl
    const put = await fetch(uploadUrl, {
      method: "PUT",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: bytes,
    });
    if (!put.ok) {
      console.error("LinkedIn image upload failed:", put.status);
      return null;
    }

    return asset;
  } catch (err) {
    console.error("LinkedIn image upload error:", err);
    return null;
  }
}

/** Publica um post no LinkedIn (texto, ou texto + imagem se `imageUrl`). */
export async function publishPost(
  accessToken: string,
  personId: string,
  postText: string,
  imageUrl?: string | null
): Promise<PublishResult> {
  let assetUrn: string | null = null;
  if (imageUrl) {
    assetUrn = await uploadImageAsset(accessToken, personId, imageUrl);
  }

  const shareContent = assetUrn
    ? {
        shareCommentary: { text: postText },
        shareMediaCategory: "IMAGE",
        media: [{ status: "READY", media: assetUrn }],
      }
    : {
        shareCommentary: { text: postText },
        shareMediaCategory: "NONE",
      };

  const body = {
    author: `urn:li:person:${personId}`,
    lifecycleState: "PUBLISHED",
    specificContent: { "com.linkedin.ugc.ShareContent": shareContent },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
    },
  };

  const res = await fetch(`${LINKEDIN_API}/ugcPosts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LinkedIn publish failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  return { postId: data.id ?? data.value };
}

/** Verifica se o token ainda é válido */
export async function verifyToken(accessToken: string): Promise<boolean> {
  try {
    const res = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}
