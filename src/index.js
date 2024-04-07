import ChromeWebStore from 'webextension-store-meta/lib/chrome-web-store';
import Amo from 'webextension-store-meta/lib/amo';
import extensions from './extensions';

export default {
	/**
	 *
	 * @param {Request} req
	 * @param {*} env
	 * @param {*} ctx
	 */
	async fetch(req, env, ctx) {
		const url = new URL(req.url);
		if (url.pathname === '/stats') {
			const round = (n) =>
				Math.round(n / 10 ** (n.toString().length - 1)) * 10 ** (n.toString().length - 1);
			const headers = { 'User-Agent': 'mue' };
			const [repo, releases, edge, chrome] = await Promise.all([
				await (await fetch('https://api.github.com/repos/mue/mue', { headers })).json(),
				await (await fetch('https://api.github.com/repos/mue/mue/releases', { headers })).json(),
				await (
					await fetch(
						'https://microsoftedge.microsoft.com/addons/getproductdetailsbycrxid/' +
						extensions.edge.split('//')[1],
					)
				).json(),
				(
					await ChromeWebStore.load({
						id: extensions.chrome.split('//')[1],
						qs: { hl: 'en' },
					})
				).meta(),
			]);
			const body = JSON.stringify({
				releases: round(releases.length),
				stars: round(repo.stargazers_count),
				users: round(chrome.users + edge.activeInstallCount),
			});
			return new Response(body, {
				headers: {
					'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
					'Content-Type': 'application/json'
				},
			});
		} else if (url.pathname === '/versions') {
			const [edge, chrome, firefox] = await Promise.all([
				await (
					await fetch(
						'https://microsoftedge.microsoft.com/addons/getproductdetailsbycrxid/' +
						extensions.edge.split('//')[1],
					)
				).json(),
				(
					await ChromeWebStore.load({
						id: extensions.chrome.split('//')[1],
						qs: { hl: 'en' },
					})
				).meta(),
				(await Amo.load({ id: extensions.firefox })).meta(),
			]);
			const edgeVersion = JSON.parse(edge.manifest).version;
			const body = JSON.stringify({
				browsers: {
					chrome: chrome.version,
					edge: edgeVersion,
					firefox: firefox.version,
					whale: edgeVersion,
				},
			});
			return new Response(body, {
				headers: {
					'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
					'Content-Type': 'application/json'
				},
			});
		} else {
			return new Response('Not Found', { status: 404 });
		}
	}
};
