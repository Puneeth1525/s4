const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const app = express();
const multer = require('multer');

app.use(bodyParser.json());
app.use(cors());

const port = process.env.PORT || 3333

const buckets = [];

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const bucketName = req.body.bucketName;
        const bucketPath = `./buckets/${bucketName}`;
        cb(null, bucketPath);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage });

function getDirectorySize(directoryPath) {
    let totalSize = 0;

    const calculateSize = (itemPath) => {
        const stats = fs.statSync(itemPath);

        if (stats.isFile()) {
            totalSize += stats.size;
        } else if (stats.isDirectory()) {
            const subItems = fs.readdirSync(itemPath);
            subItems.forEach((subItem) => {
                calculateSize(`${itemPath}/${subItem}`);
            });
        }
    };

    calculateSize(directoryPath);
    return totalSize;
}

app.post('/create-bucket', (req, res) => {
    const { bucketName } = req.body;
    if (!bucketName) {
        return res.status(400).json({ error: 'Bucket name is required' });
    }
    if (buckets.includes(bucketName)) {
        return res.status(400).json({ error: 'Bucket already exists' });
    }
    if (fs.existsSync(bucketName)) {
        return res.status(400).json({ error: 'Bucket directory already exists.' });
    }

    const bucketPath = `./buckets/${bucketName}`;
    fs.mkdirSync(bucketPath);

    buckets.push(bucketName);
    res.status(201).json({ message: 'Bucket created successfully' });
});


app.post('/upload-object', upload.single('file'), (req, res) => {
    const { bucketName } = req.body;
    if (!bucketName) {
        return res.status(400).json({ error: 'Bucket name is required' });
    }

    res.status(201).json({ message: 'Object uploaded successfully' });
});


app.get('/list-objects/:bucketName', (req, res) => {
    const bucketName = req.params.bucketName;
    const bucketPath = `./buckets/${bucketName}`;
    if (!fs.existsSync(bucketPath)) {
        return res.status(404).json({ error: 'Bucket not found' });
    }
    const objects = fs.readdirSync(bucketPath);
    res.json(objects);
});

app.get('/get-object/:bucketName/:objectKey', (req, res) => {
    const bucketName = req.params.bucketName;
    const objectKey = req.params.objectKey;
    const filePath = `./buckets/${bucketName}/${objectKey}`;
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Object not found' });
    }
    const data = fs.readFileSync(filePath, 'utf-8');
    res.send(data);
});

app.get('/list-buckets', (req, res) => {
    res.json(buckets);
});

const { exec } = require('child_process');

app.delete('/delete-bucket/:bucketName', (req, res) => {
    const bucketName = req.params.bucketName;
    const bucketPath = `./buckets/${bucketName}`;

    if (!fs.existsSync(bucketPath)) {
        return res.status(404).json({ error: 'Bucket not found' });
    }

    exec(`rimraf ${bucketPath}`, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ error: 'Failed to delete the bucket' });
        }

        const bucketIndex = buckets.indexOf(bucketName);
        if (bucketIndex !== -1) {
            buckets.splice(bucketIndex, 1);
        }

        res.json({ message: 'Bucket deleted successfully' });
    });
});


app.delete('/delete-object/:bucketName/:objectKey', (req, res) => {
    const bucketName = req.params.bucketName;
    const objectKey = req.params.objectKey;
    const filePath = `./buckets/${bucketName}/${objectKey}`;

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Object not found' });
    }

    fs.unlink(filePath, (err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to delete the object' });
        }

        res.json({ message: 'Object deleted successfully' });
    });
});

app.get('/download-object/:bucketName/:objectKey', (req, res) => {
    const bucketName = req.params.bucketName;
    const objectKey = req.params.objectKey;
    const filePath = `./buckets/${bucketName}/${objectKey}`;

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Object not found' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${objectKey}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
});


app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
