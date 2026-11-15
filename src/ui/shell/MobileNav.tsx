import type { JSX, MouseEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Icon } from "../icons/Icon";
import type { IconName } from "../icons";
import { useTranslation } from "../ports/i18n";
import { Lens } from "../components/Lens";
import { activeNav, navigateWithTransition, type NavItem } from "./navigate";
import styles from "./MobileNav.module.css";

interface Section {
  id: NavItem;
  icon: IconName;
  label: string;
  href: string;
}

export function MobileNav(): JSX.Element {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const active = activeNav(pathname);

  const sections: Section[] = [
    { id: "home", icon: "home", label: t("ui.nav.home"), href: "/" },
    { id: "library", icon: "library", label: t("ui.nav.library"), href: "/library" },
    { id: "stats", icon: "stats", label: t("ui.nav.stats"), href: "/stats" },
    { id: "recognize", icon: "recognize", label: t("ui.nav.recognize"), href: "/recognize" },
  ];

  const go = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    event.preventDefault();
    if (event.detail > 0) event.currentTarget.blur();
    navigateWithTransition(navigate, href);
  };

  return (
    <nav aria-label="Mobile Navigation" className={styles.bar}>
      {sections.map((section) => {
        const isCurrent = section.id === active;
        return (
          <a
            key={section.id}
            href={`#${section.href}`}
            data-nav={section.id}
            aria-label={section.label}
            aria-current={isCurrent ? "page" : undefined}
            className={styles.item}
            onClick={(event) => go(event, section.href)}
          >
            <div className={styles.iconWrap}>
              {isCurrent ? <Lens group="mobile-nav" value={section.id} radius={15} /> : null}
              <Icon name={section.icon} size={22} />
            </div>
            <span className={styles.label}>{section.label}</span>
          </a>
        );
      })}
    </nav>
  );
}
