"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import "./bottomnav.css";

const ITEMS = [
  { key: "home", label: "홈", icon: "home", href: "/" },
  { key: "list", label: "목록", icon: "description", href: "/notes" },
  { key: "write", label: "작성", icon: "edit_square", href: "/notes/new", fab: true },
  { key: "search", label: "검색", icon: "search", href: "/search" },
  { key: "hub", label: "허브", icon: "hub", href: "/screens/topic-hub.html" },
];

export default function BottomNav({ active }) {
  const path = usePathname() || "";

  function isActive(it) {
    if (active) return active === it.key;
    if (it.key === "list") return path === "/notes" || path.startsWith("/notes/");
    if (it.key === "search") return path.startsWith("/search");
    return path === it.href;
  }

  return (
    <nav className="bnav">
      {ITEMS.map((it) =>
        it.fab ? (
          <Link key={it.key} href={it.href} className="bnav-write" aria-label="노트 작성">
            <span className="bnav-write-circle">
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {it.icon}
              </span>
            </span>
            <span className="bnav-write-label">{it.label}</span>
          </Link>
        ) : (
          <Link
            key={it.key}
            href={it.href}
            className={`bnav-item ${isActive(it) ? "active" : ""}`}
          >
            <span
              className="material-symbols-outlined"
              style={isActive(it) ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {it.icon}
            </span>
            <span className="bnav-label">{it.label}</span>
          </Link>
        )
      )}
    </nav>
  );
}
