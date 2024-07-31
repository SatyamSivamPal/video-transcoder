import axios from "axios";
import Header from "./components/Header";
import React, { useState } from "react";
import Swal from "sweetalert2";

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState("")

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    setUploadStatus("");
    console.log(selectedFile);
  };

  async function upload() {
    if (!file) {
      Swal.fire({
        title: 'Error!',
        text: 'Please select a file to upload',
        icon: 'error',
        confirmButtonText: 'OK'
      });
      return;
    }
    const formData = new FormData();
    formData.append("video", file);

    const res = await axios.post("http://localhost:8000/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    console.log(res.data);
    Swal.fire({
      title: 'Success!',
      text: 'Upload successful!',
      icon: 'success',
      confirmButtonText: 'OK'
    });
  }

  return (
    <div>
      <Header />
      <div className="h-10/12 flex items-center justify-center flex-col">
        <div className="pt-10 w-8/12">
          <div className="flex items-center justify-center w-full">
            <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 ">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
              {file ? (
                  <div className="text-center">
                    <p className="text-lg font-semibold text-gray-700">{file.name}</p>
                    {/* Optionally, you can show a preview here if it's an image or video */}
                    <video src={URL.createObjectURL(file)} controls className="mt-4 w-32 h-32" />
                  </div>
                ) : (
                  <>
                    <svg
                      className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 20 16"
                    >
                      <path
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                      />
                    </svg>
                    <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                      <span className="font-semibold">Click to upload</span> or drag
                      and drop
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Converting into 1080p, 720p, 480p, 360p
                    </p>
                  </>
                )}
              </div>
              <input
                id="dropzone-file"
                type="file"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          </div>
        </div>
        <div>
          <button
            className="flex items-center justify-center mt-16 bg-black text-white px-10 py-3 rounded-lg text-lg"
            onClick={upload}
          >
            Upload
          </button>
        </div>
        {uploadStatus && (
          <div className="mt-4 text-lg text-center">
            {uploadStatus}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
