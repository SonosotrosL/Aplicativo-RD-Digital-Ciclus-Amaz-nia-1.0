import { supabase } from '../../lib/supabaseClient';

export class ImageUploadService {
    private static BUCKET = 'rd-photos';

    /**
     * Compresses an image file to max 1280px and 75% quality.
     */
    static async compressImage(file: File): Promise<Blob> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const reader = new FileReader();

            reader.onload = (e) => {
                img.src = e.target?.result as string;
            };

            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const maxDim = 1280;

                if (width > maxDim || height > maxDim) {
                    if (width > height) {
                        height = Math.round((height * maxDim) / width);
                        width = maxDim;
                    } else {
                        width = Math.round((width * maxDim) / height);
                        height = maxDim;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Canvas Context Error'));
                    return;
                }
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error('Compression failed'));
                }, 'image/jpeg', 0.75);
            };

            reader.onerror = err => reject(err);
            reader.readAsDataURL(file);
        });
    }

    /**
     * Uploads file to Supabase Storage and returns public URL.
     */
    static async uploadPhoto(file: File, path: string): Promise<string> {
        try {
            const compressedBlob = await this.compressImage(file);
            const fileExt = 'jpg'; // We convert to JPEG
            const filePath = `${path}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from(this.BUCKET)
                .upload(filePath, compressedBlob, {
                    upsert: true,
                    contentType: 'image/jpeg'
                });

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from(this.BUCKET).getPublicUrl(filePath);
            return data.publicUrl;
        } catch (e) {
            console.error('Upload failed:', e);
            throw e;
        }
    }
}
