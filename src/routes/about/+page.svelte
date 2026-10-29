<script lang="ts">
	import pkg from '../../../package.json';
</script>

<div class="about">
	<h2>Cairn <small>v{pkg.version}</small></h2>
	<p>
		One-tap roadside mapping for OpenStreetMap. Tap a button next to a roadside feature while
		travelling to record its position and OSM tags for later review and upload.
	</p>
	<p>
		Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer"
			>OpenStreetMap contributors</a
		>.
	</p>
	<p>
		Free software under the
		<a href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank" rel="noreferrer"
			>GNU AGPL v3 or later</a
		>. Copyright © Alen Šiljak.
	</p>
</div>

<style>
	.about {
		padding: 1rem;
		line-height: 1.5;
	}

	h2 {
		margin: 0 0 0.5rem;
	}

	small {
		font-size: 0.9rem;
		color: #999;
		font-weight: normal;
	}

	a {
		color: #6cb4ff;
	}
</style>
