import os

FILTERED = [".jpg", ".gif", ".png", ".css"]
def gather_paths():
    paths = []
    for root, _, files in os.walk('.'):
        for fname in files:
            if os.path.splitext(fname)[1] in FILTERED:
                continue
            path = os.path.join(root, fname)#合成路径和文件名
            if path.startswith('.'):
                path = path[1:]
            print(path)
            paths.append(path)

    save_paths_to_file(paths, "dictionary.txt")
    print("Successfully Saved!")

def save_paths_to_file(paths, filename):
    with open(filename, 'w') as f:
        for path in paths:
            f.write(path + '\n')

if __name__ == '__main__':
    gather_paths()
