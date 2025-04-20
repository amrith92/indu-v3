export async function uploadFiles(): Promise<
  Array<{
    name: string;
    size: number;
    type: string;
    content: ArrayBuffer;
  }>
> {
  try {
    // Create an input element to allow file selection
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;

    // Wait for the user to select files
    const files: FileList = await new Promise((resolve, reject) => {
      input.onchange = () => resolve(input.files as FileList);
      input.onerror = (error) => reject(error);
      input.click();
    });

    // Read the selected files and return their details
    const fileDetails = await Promise.all(
      Array.from(files).map(async (file) => {
        const content = await file.arrayBuffer();
        return {
          name: file.name,
          size: file.size,
          type: file.type,
          content,
        };
      })
    );

    return fileDetails;
  } catch (error) {
    console.error('Error during file upload:', error);
    throw new Error('Failed to upload files. Please try again.');
  }
}