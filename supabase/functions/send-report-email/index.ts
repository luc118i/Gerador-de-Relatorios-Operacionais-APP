const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  try {
    const apiKey = Deno.env.get('RESEND_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY não configurada.' }), {
        status: 500,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const form = await req.formData();
    const from     = form.get('from') as string;
    const fromName = form.get('fromName') as string;
    const to       = form.getAll('to') as string[];
    const subject  = form.get('subject') as string;
    const body     = form.get('body') as string;
    const pdf      = form.get('pdf') as File;

    if (!from || !to.length || !subject || !pdf) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios ausentes.' }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const pdfBytes = await pdf.arrayBuffer();
    const pdfUint8 = new Uint8Array(pdfBytes);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < pdfUint8.length; i += chunkSize) {
      binary += String.fromCharCode(...pdfUint8.subarray(i, i + chunkSize));
    }
    const pdfBase64 = btoa(binary);

    const resendPayload = {
      from: `${fromName} <${from}>`,
      to,
      subject,
      text: body,
      attachments: [
        {
          filename: pdf.name,
          content: pdfBase64,
        },
      ],
    };

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resendPayload),
    });

    const resendJson = await resendRes.json();

    if (!resendRes.ok) {
      return new Response(JSON.stringify({ error: resendJson.message ?? 'Erro no Resend.' }), {
        status: 500,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
