import React, { ChangeEvent, useMemo, useRef } from "react";
import { Pencil, X } from "lucide-react";

type ImageValue = File | Blob | string | null | undefined;

type ProfilePictureUploaderProps = {
    image: ImageValue;
    setImage: (image: ImageValue) => void;
    originalImage?: ImageValue;
    onRemove?: () => void;
    allowedTypes?: string[];
    size?: number;
    readOnly?: boolean;
};

const ProfilePictureUploader = ({
    image,
    setImage,
    originalImage,
    onRemove,
    allowedTypes = ["image/png", "image/jpeg", "image/jpg"],
    size = 96,
    readOnly = false,
}: ProfilePictureUploaderProps) => {
    const inputRef = useRef<HTMLInputElement | null>(null);

    // True only when user has picked a local file — NOT a backend URL string
    const isLocalFile = image instanceof Blob || image instanceof File;

    const previewUrl = useMemo(() => {
        if (!image) return "";

        if (typeof image === "string") {
            return image;
        }

        if (!(image instanceof Blob)) {
            return "";
        }

        return URL.createObjectURL(image);
    }, [image]);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];

        if (!file) return;

        if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
            alert("Invalid file type");
            return;
        }

        setImage(file);
    };

    const handleRemove = () => {
        // Reset to backend original image if available, otherwise clear
        setImage(originalImage ?? null);
        if (inputRef.current) inputRef.current.value = "";
        onRemove?.();
    };

    return (
        <div
            className="relative"
            style={{ width: size, height: size }}
        >
            {/* Avatar circle */}
            <div className="w-full h-full rounded-full overflow-hidden bg-gray-200 border border-gray-200">
                {previewUrl ? (
                    <img
                        src={previewUrl}
                        alt="Profile Preview"
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
                        No Image
                    </div>
                )}
            </div>

            {/* X button — only for locally uploaded File/Blob, not backend images */}
            {!readOnly && isLocalFile && (
                <button
                    type="button"
                    onClick={handleRemove}
                    className="absolute top-0 right-0 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md border-2 border-white hover:bg-red-600 hover:scale-105 transition"
                >
                    <X size={12} />
                </button>
            )}

            {/* Pencil / upload button */}
            {!readOnly && (
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-black text-white flex items-center justify-center shadow-md border-2 border-white hover:scale-105 transition"
                >
                    <Pencil size={14} />
                </button>
            )}

            <input
                ref={inputRef}
                type="file"
                accept={allowedTypes.join(",")}
                className="hidden"
                onChange={handleFileChange}
            />
        </div>
    );
};

export default ProfilePictureUploader;
