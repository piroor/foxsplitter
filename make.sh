#!/bin/sh

appname=foxsplitter

cp buildscript/makexpi.sh ./
./makexpi.sh -n $appname
rm ./makexpi.sh

