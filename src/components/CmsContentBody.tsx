import Image from "next/image";
import { parseCmsBody } from "@/lib/cms-content-format";

export function CmsContentBody({ body, imageClassName }: Readonly<{ body: string | null | undefined; imageClassName?: string }>) {
  return parseCmsBody(body).map((block, blockIndex) => {
    if (block.type === "image") {
      return <Image className={imageClassName} key={`${blockIndex}-${block.src}`} src={block.src} alt={block.alt} width={1200} height={675} unoptimized />;
    }
    return <p key={`text-${blockIndex}`}>{block.content.map((item, inlineIndex) => item.type === "link"
      ? <a key={`link-${inlineIndex}`} href={item.href} target="_blank" rel="noopener noreferrer">{item.text}</a>
      : <span key={`text-${inlineIndex}`}>{item.text}</span>)}</p>;
  });
}
