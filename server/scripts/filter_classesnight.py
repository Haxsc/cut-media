import numpy as np
import cv2
import glob
import argparse
from ultralytics import YOLO

# termination criteria
criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 0.001)


def load_coefficients(path):
    """ Loads camera matrix and distortion coefficients. """
    # FILE_STORAGE_READ
    cv_file = cv2.FileStorage(path, cv2.FILE_STORAGE_READ)

    # note we also have to specify the type to retrieve other wise we only get a
    # FileNode object back instead of a matrix
    camera_matrix = cv_file.getNode("K").mat()
    dist_matrix = cv_file.getNode("D").mat()

    cv_file.release()
    return [camera_matrix, dist_matrix]

def undistort_video(video_path,calibration_file_path,output_video_file_path,fps=30,max_frames=0,classes_filter_int_array=[]):
    cap = cv2.VideoCapture(video_path)
    
    # Define cv Window to 400x400
    #cv2.namedWindow("undistort", cv2.WINDOW_NORMAL)
    #cv2.resizeWindow("undistort", 600, 600)
    
    model = YOLO('/data/models/noturnov5.pt')
    
    

    
    # Load calibration file
    if calibration_file_path:
        camera_matrix, dist_matrix = load_coefficients(calibration_file_path)

    # Initialize variables
    newcameramtx = None
    roi = None
    h = 0
    w = 0
    writer = None
    last_frame = None
    max_frames =max_frames-0

    map1 = None
    map2 = None
    mapped=False

    current_frame=0
    acc_frame=0
    acc_errors=0

    # Loop through the video frames
    while cap.isOpened():
        # Read a frame from the video
        success, frame = cap.read()
        current_frame+=1
        print("Current frame: ",current_frame)
        print("acc_frame: ",acc_frame)
        

        if success:
            acc_errors=0
            if (h ==0) or (w == 0):
                h,  w = frame.shape[:2]


            # Remove lens distortion from the frame using the calibration file 'calibration.yaml'
            if calibration_file_path:
                if map1 is None:
                    _w = int(w*1.1)
                    _h = int(h*1.1)
                    map1,map2=cv2.initUndistortRectifyMap(camera_matrix, dist_matrix, None  , None, (_w,_h), cv2.CV_32FC1)

                if (map1 is not None) and (map2 is not None):
                    frame = cv2.remap(frame, map1, map2, cv2.INTER_LINEAR)

            annotated_frame=frame

            results = model.predict(source=frame, save=False, save_txt=False)  # save predictions as labels

            # check if there is any detection of classes 1,3,4,7,8,9
            # {0: 'carro', 1: 'caminhao', 2: 'moto', 3: 'van', 4: 'onibus', 5: 'roda', 6: 'pessoa', 7: 'bicicleta', 8: 'carreta', 9: 'carretinha'}            

            has_detections = False
            if results is not None:
                for result in results[0].boxes:
                    if result.cls in classes_filter_int_array:    
                        has_detections = True
                        break
                    elif classes_filter_int_array == []:
                        has_detections = True
                        break

            # Visualize the results on the frame
            if results is not None:
                annotated_frame = results[0].plot()

            # Write the frame to the output video file
            if writer is None:
                fourcc = cv2.VideoWriter_fourcc(*"xvid")
                h,  w = frame.shape[:2]
                writer = cv2.VideoWriter(output_video_file_path, fourcc, fps, (w, h), True)


            if has_detections:
                acc_frame+=1
                writer.write(frame)
                

            # Display the annotated frame
            #cv2.imshow("undistort", annotated_frame)

            # Break the loop if 'q' is pressed
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break

            if max_frames>0 and acc_frame>max_frames:
                break

        else:
            # Break the loop if the end of the video is reached
            acc_errors+=1
            print("Error: ",acc_errors)
            if (acc_errors>1000000):
                break

    # Release the video capture object and close the display window
    cap.release()
    #cv2.destroyAllWindows()


if __name__ == "__main__":
    # Parse command line arguments
    parser = argparse.ArgumentParser(description="Undistort a video file using a calibration file")
    parser.add_argument("--video", help="path to video file")
    parser.add_argument("--calibration", help="path to calibration file")
    parser.add_argument("--output", help="path to output video file")
    parser.add_argument("--fps", help="video FPS", default=0,type=int)
    parser.add_argument("--maxframes", help="max frames to process", default=0,type=int)
    parser.add_argument("--classes", help="filter classes", default=0,type=str)

    args = parser.parse_args()

    # Load the video file
    video_path = args.video
    calibration_file = args.calibration
    print("calibration_file: ",calibration_file)
    output_video_file = args.output

    max_frames = args.maxframes
    classes_filter = args.classes
    classes_filter_int_array = []
    if classes_filter:
        classes_filter_int_array = [int(x) for x in classes_filter.split(",")]
        print("classes_filter_int_array: ",classes_filter_int_array)

    # Get video FPS 
    fps=0
    if (args.fps != 0):
        fps = args.fps
    cap = cv2.VideoCapture(video_path)
    if (fps == 0):
        # take avg_frame_rate from video file via ffprobe
        import subprocess as sp
        command = ['ffprobe', '-v', 'error', '-select_streams', 'v', '-of', 'default=noprint_wrappers=1:nokey=1',
                '-show_entries', 'stream=avg_frame_rate', video_path]
        try:
            fps = eval(sp.check_output(command).decode('utf-8').strip())
        except:
            fps=30


    cap.release()
    print(f"Video FPS: {fps}")

    # Undistort the video file
    print("MAX_FRAMES:" ,max_frames)
    undistort_video(video_path, calibration_file, output_video_file,fps,max_frames,classes_filter_int_array)
