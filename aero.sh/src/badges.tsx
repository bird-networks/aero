/**
 * Badge components for Aero footer
 * Contains GitHubBadge, DreamlandBadge, and FooterBadges
 */

/** GitHub logo badge component (Material theme tone, larger, white logo, white circle) */
const GitHubBadge: Component<{}> = function () {
	this.css = `
    .github-logo-link {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: var(--md-sys-color-primary-container);
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: box-shadow 0.2s, background 0.2s;
      text-decoration: none;
      border: 3px solid #fff;
    }
    .github-logo-link:hover {
      box-shadow: 0 4px 16px rgba(0,0,0,0.16);
      background: var(--md-sys-color-primary);
    }
    .github-logo-img {
      width: 28px;
      height: 28px;
      display: block;
      object-fit: contain;
    }
  `;
	return (
		<a
			href="https://github.com/browser-ports/aero"
			target="_blank"
			rel="noopener noreferrer"
			class="github-logo-link"
			aria-label="Aero on GitHub"
		>
			<img
				class="github-logo-img"
				src="/imgs/badges/github-mark.svg"
				alt="GitHub Logo"
			/>
		</a>
	);
};

/** Footer badge row container */
export const FooterBadges: Component<{}> = function () {
	this.css = `
    .footer-links {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      gap: 16px;
      margin-top: -1rem;
      margin-bottom: 1.5rem;
    }
  `;
	return (
		<div class="footer-links content-block">
			<GitHubBadge />
		</div>
	);
};
