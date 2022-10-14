export function log(context: string, ...message: any[]) {
  console.log(context, "->", ...message);
}
