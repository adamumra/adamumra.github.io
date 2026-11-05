---
layout: blog-article
published: false
title: Sharper Angles Without More Antennas
subtitle: Generating large-array spectra from small-array radar measurements.
description: Why reconstruct every radar signal when the goal is to find a few angles? A visual guide to conditional spectrum diffusion.
date: 2026-11-05
cover: /images/blog/array-emulation.svg
cover_alt: Two broad angular peaks contrasted with two narrow peaks
topic: Research notes · Radar & machine learning
topics: Radar / Diffusion / Direction of arrival
paper_url: https://arxiv.org/abs/2609.30562
blog_styles: true
blog_interactive: true
---

Two nearby targets can leave a small radar with an ambiguous angular spectrum. A larger aperture helps distinguish their directions, but adding antennas also increases hardware cost and complexity.

Our paper asks a different question: **can we learn to generate the angular spectrum associated with a larger array, using only measurements from the smaller one?**

The important choice is *what* to generate. Instead of reconstructing all the signals that a larger array might have measured, we generate the spectrum used for direction-of-arrival estimation directly.

<div class="takeaway" markdown="1">
**The idea in one sentence:** use the small array’s spatial information to guide a diffusion model toward candidate large-array spectra, then look for agreement between their peaks.
</div>

<nav class="article-toc" aria-label="In this article">
<strong>Follow the idea</strong>
<ol>
<li><a href="#aperture">The aperture problem</a></li>
<li><a href="#representation">What to predict</a></li>
<li><a href="#diffusion">Why diffusion</a></li>
<li><a href="#consensus">Finding agreement</a></li>
<li><a href="#results">Evidence and limits</a></li>
</ol>
</nav>

## Two directions, one broad feature {#aperture}

A spatial spectrum assigns a score to each candidate arrival angle. We search for peaks to estimate target directions. The difficulty is that a finite aperture, finite observations, and noise can make nearby targets hard to separate.

Think of the aperture as a spatial baseline: a wider baseline provides more variation in phase across the array for a given change in angle. That makes nearby directions easier to distinguish. It does not guarantee that every spectrum will have perfectly clean peaks—signal quality and the estimator still matter.

Try reducing the target separation below. The broad curves begin to merge sooner than the narrow ones.

{% include blog/aperture.html %}

These curves illustrate peak overlap; they are **not computed MUSIC spectra**. MUSIC’s resolution also depends on SNR, snapshot count, source relationships, and subspace estimation. We use this simplified picture to isolate one intuition: closely spaced directions become difficult to distinguish when the spectrum does not resolve them clearly.

## Predict the representation you actually need {#representation}

One route to array emulation is to train a network to map small-array snapshots to large-array snapshots. Then we form a covariance matrix and run MUSIC on the reconstructed signals.

That route has an indirect objective. A low reconstruction error does not necessarily mean that the final spectral peaks fall at the right angles. Errors can alter the estimated signal subspace, and a small spurious peak can become important when we select the strongest peaks.

There is also something we should not ask a network to recover: the particular noise realization that an unobserved large array would have recorded. The small array does not tell us that.

Our alternative is to **learn the final spectral representation directly**.

<figure class="story-figure">
<div class="figure-top"><strong>From measurements to angles</strong><span class="schematic-label">Method overview</span></div>
<div class="flow">
<div class="flow-step">Small-array measurements<small>Combine redundant virtual channels; form a normalized covariance</small></div>
<div class="flow-arrow" aria-hidden="true">↓</div>
<div class="flow-pair">
<div class="flow-step">Covariance encoding<small>Complex spatial relationships</small></div>
<div class="flow-step">Small-array MUSIC spectrum<small>An explicit angular view</small></div>
</div>
<div class="flow-arrow" aria-hidden="true">↓ both condition the model</div>
<div class="flow-step">Conditional spectrum diffusion<small>Generate several candidate large-array spectra</small></div>
<div class="flow-arrow" aria-hidden="true">↓</div>
<div class="flow-step">Peak consensus → estimated directions</div>
</div>
<div class="training-note"><strong>Training only:</strong> the ideal large-array MUSIC spectrum provides supervision. It is computed from the simulated scene’s ensemble covariance, rather than a noisy finite set of large-array snapshots.</div>
<figcaption>At inference, the condition comes entirely from the small array. Neither large-array measurements nor the true target directions are supplied to the model.</figcaption>
</figure>

Why provide both inputs? The covariance retains complex spatial relationships between channels. The MUSIC spectrum gives the model an explicit view of where angular energy appears. The spectrum is derived from the same measurements; it does not add a second independent source of information. It gives that information a useful structure for learning.

<details markdown="1">
<summary>A little more detail: the virtual array</summary>

In colocated MIMO radar, transmit–receive pairs form virtual channels. Several pairs can share the same virtual position. We coherently combine those redundant channels before forming the covariance, using a normalization that preserves white noise under the paper’s measurement model. We then normalize the covariance by its trace to remove the overall power scale.

For the paper’s 10-transmit/10-receive setup, 100 transmit–receive channels correspond to 19 distinct virtual positions. The 16-transmit/16-receive reference has 31. These are virtual positions, not counts of additional physical antennas.
</details>

## Why generate several possibilities? {#diffusion}

Small-array measurements do not uniquely specify everything a larger array would observe. A model has to combine the available evidence with structure learned during training.

A deterministic predictor returns one spectrum in one pass. A conditional diffusion model instead starts from noise and repeatedly refines a candidate, guided throughout by the small-array condition.

During training, noise is added to the target spectrum, and the model learns to predict the clean target from different noise levels. During inference, that learned correction is used repeatedly to move from a noisy initial state toward a structured spectrum. This is generation *conditioned on measurements*, rather than simply smoothing the measured MUSIC spectrum.

{% include blog/diffusion.html %}

The illustration shows the intuition, not a recorded model trajectory. In the paper, sampling uses five DDIM steps. Each step uses a learned clean-spectrum estimate to construct the next state; it is not a linear blend between noise and a known answer.

The training objective also emphasizes neighborhoods around true target peaks. That encourages the model to care about the part of the spectrum that matters most for angle estimation, while still learning the full spectral shape.

## Let peaks agree before choosing angles {#consensus}

Different noise initializations can yield slightly different candidate spectra for the same measurements. Suppose several candidates put a peak near the same angle, while a competing peak appears in only one candidate. The recurring location has stronger support across the samples.

This motivates **peak consensus**. We extract peaks from individual candidates and accumulate their votes over angle. We then select the strongest separated locations from that vote.

{% include blog/consensus.html %}

Why not average the spectra first? Candidates can have different peak heights and competing peaks. Averaging curves can blur those distinctions. Voting on peak locations focuses the combination on the quantity we ultimately want: the directions.

The paper uses four candidate trajectories and assumes the number of targets is known. The two-target illustration above keeps the voting idea easy to inspect. Agreement between generated candidates is useful, but it is not a calibrated confidence interval or proof that a direction is correct: all candidates share the same measurements and learned model.

## What the experiments tell us—and what they do not {#results}

The paper evaluates simulated MIMO-radar scenes, comparing spectrum diffusion with small- and large-array MUSIC, a scene-matched snapshot-reconstruction DNN, and a deterministic spectrum predictor.

The deterministic comparison is especially helpful: it keeps the conditioning, targets, and spectral backbone matched while removing the diffusion generation procedure and multi-sample consensus.

<table class="result-table">
<caption>Reported results from Table 1 of the paper. RMSE pooled across evaluated SNRs and angular sectors; lower is better.</caption>
<thead><tr><th scope="col">Method</th><th scope="col">Pooled angle RMSE</th></tr></thead>
<tbody>
<tr><th scope="row">Deterministic spectrum predictor</th><td>4.107°</td></tr>
<tr><th scope="row">Conditional spectrum diffusion</th><td>0.297°</td></tr>
</tbody>
</table>

That comparison supports the combined diffusion-and-consensus procedure in the evaluated setup. It does not isolate the contribution of each component, and it is not a claim that the same improvement holds for every radar scene.

Three limits are worth keeping in view:

- **The hardware aperture remains the same.** The model uses a learned prior to infer a useful spectral representation; it does not create new independent measurements.
- **Training coverage matters.** Different target statistics, array calibration errors, or propagation conditions can change performance. Simulation results do not establish robustness on measured hardware.
- **A generated peak can still be wrong.** A plausible-looking spectrum is not sufficient evidence of accuracy. Evaluation must compare estimated directions with held-out ground truth.

The Cramér–Rao bounds in the paper are measurement-model references for unbiased estimators. They should not be read as evidence that a learned estimator has removed the information limits of the small array.

## The broader lesson

For me, the central idea is a choice of representation: **learn the quantity that serves the downstream task**. If the goal is to estimate angles, reconstructing every intermediate signal may be unnecessary—and can introduce errors before we ever reach the spectrum.

Conditional spectrum diffusion puts the learning effort closer to that goal. The small array supplies the evidence, the learned model supplies structure, and consensus turns candidate spectra into direction estimates.

<div class="takeaway" markdown="1">
**Want the full details?** Read [Generative Large-Array Emulation for DOA Estimation in MIMO Radar via Conditional Diffusion](https://arxiv.org/abs/2609.30562), by Adam Umra, Aya Mostafa Ahmed, and Aydin Sezgin.
</div>

<div class="references" markdown="1">
### Further reading

- [Our paper](https://arxiv.org/abs/2609.30562): the measurement model, training procedure, evaluation, and full results.
- [Ahmed et al., *Deep Learning for DOA Estimation in MIMO Radar Systems via Emulation of Large Antenna Arrays*](https://arxiv.org/abs/2007.13824): background on snapshot-based array emulation.

All interactive spectrum curves in this article are schematic illustrations constructed for explanation. They are not model outputs or experimental evidence. The numerical table above is reported from the paper.
</div>
