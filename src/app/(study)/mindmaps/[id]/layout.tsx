import React from "react";

export function generateStaticParams() {
  return [
    { id: "default" },
    { id: "1" },
    { id: "2" },
    { id: "3" },
  ];
}

export default function MindMapIdLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
