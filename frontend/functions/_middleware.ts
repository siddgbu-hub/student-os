export async function onRequest(context: {
  request: Request;
  next: () => Promise<Response>;
}): Promise<Response> {
  const url = new URL(context.request.url);

  // Redirect only student-os-19f.pages.dev (and its preview branch subdomains) to canonical user app domain
  if (url.hostname === 'student-os-19f.pages.dev' || url.hostname.endsWith('.student-os-19f.pages.dev')) {
    url.hostname = 'studentos.kryvlance.in';
    return Response.redirect(url.toString(), 308);
  }

  return context.next();
}
