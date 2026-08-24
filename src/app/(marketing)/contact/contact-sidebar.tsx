import { Icon } from "@/components/shared/icon";

export type ContactChannels = {
  email: string;
  phone: string | null;
  address: string | null;
};

export function ContactSidebar({ channels }: { channels: ContactChannels }) {
  return (
    <aside className="v2-contact-side">
      <a className="v2-channel dark" href={`mailto:${channels.email}`}>
        <span className="v2-channel-ico">
          <Icon name="mail" size={20} />
        </span>
        <div>
          <div className="v2-channel-label">Email</div>
          <div className="v2-channel-title">{channels.email}</div>
          <div className="v2-channel-sub">We read every message</div>
        </div>
        <span className="v2-channel-arrow">
          <Icon name="arrowRight" size={16} />
        </span>
      </a>
      {channels.phone ? (
        <a
          className="v2-channel"
          href={`tel:${channels.phone.replace(/[^\d+]/g, "")}`}
        >
          <span className="v2-channel-ico">
            <Icon name="phone" size={20} />
          </span>
          <div>
            <div className="v2-channel-label">Phone</div>
            <div className="v2-channel-title">{channels.phone}</div>
          </div>
          <span className="v2-channel-arrow">
            <Icon name="arrowRight" size={16} />
          </span>
        </a>
      ) : null}
      {channels.address ? (
        <div className="v2-channel">
          <span className="v2-channel-ico">
            <Icon name="mapPin" size={20} />
          </span>
          <div>
            <div className="v2-channel-label">Address</div>
            <div className="v2-channel-title">{channels.address}</div>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
