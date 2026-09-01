import type { CSSProperties, ReactNode } from "react";
import { COMMUNITY_COLORS, COMMUNITY_FONT_SIZES, normalizeCommunityLink, normalizeCommunityVideoUrl, type CommunityNode } from "@/lib/guide-community";
import styles from "./CommunityRichText.module.css";

function children(node: CommunityNode, key: string): ReactNode {
  return node.content?.map((child, index) => <NodeView key={`${key}-${index}`} node={child} path={`${key}-${index}`} />);
}

function NodeView({ node, path }: Readonly<{ node: CommunityNode; path: string }>) {
  if (node.type === "text") {
    let content: ReactNode = node.text ?? "";
    for (const mark of node.marks ?? []) {
      if (mark.type === "bold") content = <strong>{content}</strong>;
      if (mark.type === "italic") content = <em>{content}</em>;
      if (mark.type === "link") {
        const href = normalizeCommunityLink(mark.attrs?.href);
        if (href) content = <a href={href} target="_blank" rel="noopener noreferrer nofollow">{content}</a>;
      }
      if (mark.type === "textStyle") {
        const style: CSSProperties = {};
        if (COMMUNITY_COLORS.includes(mark.attrs?.color as never)) style.color = mark.attrs?.color;
        if (COMMUNITY_FONT_SIZES.includes(mark.attrs?.fontSize as never)) style.fontSize = mark.attrs?.fontSize;
        content = <span style={style}>{content}</span>;
      }
    }
    return content;
  }
  const nested = children(node, path);
  if (node.type === "doc") return <div className={styles.content}>{nested}</div>;
  if (node.type === "paragraph") return <p>{nested}</p>;
  if (node.type === "heading") return node.attrs?.level === 3 ? <h3>{nested}</h3> : <h2>{nested}</h2>;
  if (node.type === "blockquote") return <blockquote>{nested}</blockquote>;
  if (node.type === "bulletList") return <ul>{nested}</ul>;
  if (node.type === "orderedList") return <ol>{nested}</ol>;
  if (node.type === "listItem") return <li>{nested}</li>;
  if (node.type === "hardBreak") return <br />;
  if (node.type === "horizontalRule") return <hr />;
  if (node.type === "image" && typeof node.attrs?.src === "string") {
    // The API stores only a server-verified Cloudinary URL.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={node.attrs.src} alt={typeof node.attrs.alt === "string" ? node.attrs.alt : ""} loading="lazy" />;
  }
  if (node.type === "video") {
    const src = normalizeCommunityVideoUrl(node.attrs?.src, process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim());
    if (!src) return null;
    return <video className={styles.video} src={src} controls preload="metadata">이 브라우저에서는 동영상을 재생할 수 없습니다.</video>;
  }
  return null;
}

export function CommunityRichText({ document }: Readonly<{ document: CommunityNode }>) {
  return <NodeView node={document} path="root" />;
}
