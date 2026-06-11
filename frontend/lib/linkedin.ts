const LINKEDIN_API = "https://api.linkedin.com/v2";

export interface PublishResult {
  postId: string;
}

/** Publica um post de texto no LinkedIn */
export async function publishPost(
  accessToken: string,
  personId: string,
  postText: string
): Promise<PublishResult> {
  const body = {
    author: `urn:li:person:${personId}`,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text: postText },
        shareMediaCategory: "NONE",
      },
    },
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
