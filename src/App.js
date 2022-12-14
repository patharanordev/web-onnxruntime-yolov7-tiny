import React, { useState, useEffect, useRef } from "react";
import * as ort from "onnxruntime-web";
import Loader from "./components/loader";
import LocalImageButton from "./components/local-image";
import { renderBoxes } from "./utils/renderBox";
import labels from "./utils/labels.json";
import "./style/App.css";

const App = () => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const imageRef = useRef(null);
  const canvasRef = useRef(null);

  // // configs
  // const modelName = "yolov7-tiny";
  const modelName = 'yolov7-tiny-640-best';
  const IMG_SIZE = 640

  /**
   * Callback function to detect image when loaded
   */
  const detectImage = async () => {
    const mat = cv.imread(imageRef.current); // read from img tag
    const matC3 = new cv.Mat(IMG_SIZE, IMG_SIZE, cv.CV_8UC3); // new image matrix (IMG_SIZE x IMG_SIZE)
    cv.cvtColor(mat, matC3, cv.COLOR_RGBA2BGR); // RGBA to BGR
    const input = cv.blobFromImage(
      matC3,
      1 / 255.0,
      new cv.Size(IMG_SIZE, IMG_SIZE),
      new cv.Scalar(0, 0, 0),
      true,
      false
    ); // preprocessing image matrix
    // release
    mat.delete();
    matC3.delete();

    const tensor = new ort.Tensor("float32", input.data32F, [1, 3, IMG_SIZE, IMG_SIZE]); // to ort.Tensor
    const { output } = await session.run({ images: tensor }); // run session and get output layer

    const boxes = [];

    // looping through output
    for (let r = 0; r < output.size; r += output.dims[1]) {
      const data = output.data.slice(r, r + output.dims[1]); // get rows
      const [x0, y0, x1, y1, classId, score] = data.slice(1);
      const w = x1 - x0,
        h = y1 - y0;
      boxes.push({
        classId: classId,
        probability: score,
        bounding: [x0, y0, w, h],
      });
    }

    renderBoxes(canvasRef, boxes, labels); // Draw boxes
  };

  useEffect(() => {
    cv["onRuntimeInitialized"] = () => {
      ort.InferenceSession.create(`${process.env.PUBLIC_URL}/model/${modelName}.onnx`).then(
        (yolov7) => {
          setSession(yolov7);
          setLoading(false);
        }
      );
    };
  }, []);

  return (
    <div className="App">
      <h2>
        Object Detection Using YOLOv7 & <code>onnxruntime-web</code>
      </h2>
      {loading ? (
        <Loader>Getting things ready...</Loader>
      ) : (
        <p>
          <code>onnxruntime-web</code> serving {modelName}
        </p>
      )}

      <div className="content">
        <img id="img" ref={imageRef} src="#" alt="" />
        <canvas id="canvas" width={IMG_SIZE} height={IMG_SIZE} ref={canvasRef} />
      </div>

      <LocalImageButton imageRef={imageRef} callback={detectImage} />
    </div>
  );
};

export default App;
