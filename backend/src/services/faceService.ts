export class FaceService {
  /**
   * Euclidean distance threshold for 128-d face descriptors.
   * Standard threshold in face-api.js / dlib: <= 0.50 is high confidence match.
   */
  static readonly MATCH_THRESHOLD = 0.50;

  /**
   * Validates if the given descriptor is a valid 128-element numerical vector
   */
  static isValidDescriptor(descriptor: any): descriptor is number[] {
    if (!Array.isArray(descriptor)) return false;
    if (descriptor.length !== 128) return false;
    return descriptor.every((val) => typeof val === 'number' && !isNaN(val) && isFinite(val));
  }

  /**
   * Computes Euclidean distance between two face descriptor vectors
   */
  static euclideanDistance(v1: number[], v2: number[]): number {
    if (v1.length !== v2.length) {
      throw new Error(`Descriptor length mismatch: ${v1.length} vs ${v2.length}`);
    }

    let sum = 0;
    for (let i = 0; i < v1.length; i++) {
      const diff = v1[i] - v2[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  /**
   * Compares a candidate face descriptor against a registered descriptor.
   * Returns whether it's a match and the confidence percentage.
   */
  static matchDescriptor(
    candidate: number[],
    registered: number[],
    threshold = FaceService.MATCH_THRESHOLD
  ): { isMatch: boolean; distance: number; confidencePercent: number } {
    const distance = FaceService.euclideanDistance(candidate, registered);
    const isMatch = distance <= threshold;

    // Confidence mapping: 0 distance = 100%, threshold distance = 70%, > threshold scales down
    let confidencePercent = Math.max(0, Math.min(100, Math.round((1 - distance / (threshold * 1.5)) * 100)));
    if (isMatch && confidencePercent < 70) {
      confidencePercent = 70;
    }

    return {
      isMatch,
      distance: Math.round(distance * 1000) / 1000,
      confidencePercent,
    };
  }
}

