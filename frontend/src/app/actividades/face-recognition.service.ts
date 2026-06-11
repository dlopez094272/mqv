import { Injectable } from '@angular/core';

type FaceApi = typeof import('@vladmandic/face-api');

@Injectable({ providedIn: 'root' })
export class FaceRecognitionService {
  private fa: FaceApi | null = null;
  private modelsLoaded = false;
  private loadPromise: Promise<void> | null = null;

  async loadModels(): Promise<void> {
    if (this.modelsLoaded) return;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      this.fa = await import('@vladmandic/face-api');
      const MODEL_URL = '/assets/face-models';
      await this.fa.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
      await this.fa.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      await this.fa.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      this.modelsLoaded = true;
    })();

    return this.loadPromise;
  }

  async getDescriptorFromUrl(imageUrl: string): Promise<Float32Array | null> {
    if (!this.fa) throw new Error('Modelos no cargados');
    try {
      const img = await this.fa.fetchImage(imageUrl);
      const det = await this.fa
        .detectSingleFace(img, new this.fa.SsdMobilenetv1Options({ minConfidence: 0.3 }))
        .withFaceLandmarks()
        .withFaceDescriptor();
      return det?.descriptor ?? null;
    } catch {
      return null;
    }
  }

  buildMatcher(personas: { idpersonas: number; descriptor: number[] }[]): any {
    if (!this.fa) throw new Error('Modelos no cargados');
    const labeled = personas.map(p =>
      new this.fa!.LabeledFaceDescriptors(
        String(p.idpersonas),
        [new Float32Array(p.descriptor)]
      )
    );
    return new this.fa.FaceMatcher(labeled, 0.5);
  }

  async detectInVideo(video: HTMLVideoElement): Promise<any[]> {
    if (!this.fa) throw new Error('Modelos no cargados');
    return this.fa
      .detectAllFaces(video, new this.fa.SsdMobilenetv1Options({ minConfidence: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptors();
  }

  resizeResults(detections: any[], dims: { width: number; height: number }): any[] {
    if (!this.fa) return detections;
    return this.fa.resizeResults(detections, dims);
  }

  matchDimensions(canvas: HTMLCanvasElement, video: HTMLVideoElement): void {
    if (!this.fa) return;
    this.fa.matchDimensions(canvas, { width: video.videoWidth, height: video.videoHeight });
  }
}
