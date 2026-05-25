import { Icon, type IconName } from "@/components/shared/icon";

type Props = {
  eyebrow: string;
  title: string;
  emphasis?: string;
  description: string;
  icon?: IconName;
};

export function ComingSoon({
  eyebrow,
  title,
  emphasis,
  description,
  icon = "sparkles",
}: Props) {
  return (
    <>
      <header className="v2-ahead">
        <div>
          <span className="v2-eyebrow">{eyebrow}</span>
          <h1>
            {title} {emphasis ? <em>{emphasis}</em> : null}
          </h1>
          <p className="v2-ahead-sub">{description}</p>
        </div>
      </header>
      <div className="v2-acard">
        <div className="v2-coming-soon">
          <div className="v2-coming-soon-ico">
            <Icon name={icon} size={24} />
          </div>
          <h2>
            Coming <em>soon</em>
          </h2>
          <p>
            This surface is part of the next admin sprint. The page shell,
            data layer, and roll-up jobs are in place — the dedicated UI is
            being built alongside the production data it needs.
          </p>
        </div>
      </div>
    </>
  );
}
