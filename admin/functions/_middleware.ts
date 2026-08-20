export async function onRequest(context: {
  request: Request;
  next: () => Promise<Response>;
}): Promise<Response> {
  const url = new URL(context.request.url);

  // Redirect only student-os-admin.pages.dev (and its preview branch subdomains) to canonical admin domain
  if (url.hostname === 'student-os-admin.pages.dev' || url.hostname.endsWith('.student-os-admin.pages.dev')) {
    url.hostname = 'admin.studentos.kryvlance.in';
    return Response.redirect(url.toString(), 308);
  }

  return context.next();
}
