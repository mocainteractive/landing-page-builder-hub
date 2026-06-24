export function Preview({ doc }: { doc: string }) {
  return (
    <iframe
      title="Anteprima"
      srcDoc={doc}
      sandbox="allow-scripts allow-same-origin"
      className="w-full h-full border border-gray-200 rounded-xl bg-white shadow-sm"
    />
  );
}
